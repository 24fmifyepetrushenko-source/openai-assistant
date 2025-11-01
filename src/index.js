import chalk from "chalk";
import { config as dotEnvConfig } from "dotenv";
import { getFileId, getVectorStoreId } from "./file_manager.js";
import {
  getAssistantId,
  updateAssistantWithVectorStore,
  getAssistantInstructionsText,
} from "./assistant_manager.js";
import {
  getThreadId,
  addMessageToThread,
  getLastResponse,
} from "./thread_manager.js";
import { runAssistantOnThread, getRunStatus } from "./run_manager.js";
import { createOpenAIClient } from "./openai_client.js";
import { loadResponsesConfig } from "./reasoning_api/config_loader.js";
import {
  initConversation,
  recordUserMessage,
  recordAssistantMessage,
} from "./reasoning_api/conversation.js";
import { buildResponsesPrompt } from "./reasoning_api/prompt_builder.js";
import { buildFileSearchAttachments } from "./reasoning_api/attachments.js";
import {
  createResponse,
  awaitResponseCompletion,
  extractAssistantReply,
} from "./reasoning_api/response_runner.js";
import { logUsageFromResponse } from "./reasoning_api/usage_logger.js";

dotEnvConfig({ path: ".env" });
const openai = await createOpenAIClient();

// Ця головна функція запускає всі кроки: шукає файли, асистента і веде діалог.
async function main(openAiInstance) {
  // Готуємо службові змінні для контролю кількості запусків і затримки.
  let runStatus;
  let runCount = 0;
  const maxRunsEnv = Number.parseInt(process.env.MAX_RUNS ?? "", 10);
  const maxRuns = Number.isFinite(maxRunsEnv) && maxRunsEnv > 0 ? maxRunsEnv : Infinity;
  const pollIntervalEnv = Number.parseInt(
    process.env.POLL_INTERVAL_MS ?? "2000",
    10
  );
  const pollInterval = Number.isFinite(pollIntervalEnv) && pollIntervalEnv > 0 ? pollIntervalEnv : 2000;
  const useResponsesApi =
    String(process.env.RESPONSE_API ?? "").toLowerCase() === "true";

  // Виконуємо кроки послідовно і ловимо помилки у одному місці.
  try {
    // 1. Отримання ID файлу
    const fileId = await getFileId(openAiInstance, process.env.FILE_NAME);
    const fileIds = [fileId];

    console.log(`✔️ Id файлу: ${chalk.grey.bold(fileId)}`);

    let vectorStoreId;

    if (!useResponsesApi) {
      // Assistants API path
      // 3. Отримання ID асистента
      const assistantId = await getAssistantId(
        openAiInstance,
        process.env.ASSISTANT_NAME
      );

      console.log(`✔️ Id асистента: ${chalk.grey.bold(assistantId)}`);

      vectorStoreId = await getVectorStoreId(openAiInstance, fileIds);

      console.log(`✔️ Id векторного сховища: ${chalk.grey.bold(vectorStoreId)}`);

      // 4. Завантажуємо файли у асистента. (Отримуємо векторне сховище)
      await updateAssistantWithVectorStore(openAiInstance, assistantId, vectorStoreId);

      // 5. Отримання ID треду
      const threadId = await getThreadId(openAiInstance);

      console.log(`✔️ Id треду: ${chalk.grey.bold(threadId)}`);

      // Логіка надсилання повідомлень і отримування відповідей
      // Цей цикл дозволяє задавати питання кілька разів, поки не досягнемо ліміту.
      while (runCount < maxRuns) {
        const message = await askUserMessage();

        // 6. Додавання повідомлення в тред
        await addMessageToThread(openAiInstance, threadId, message);

        // 7. Запуск асистента
        const runObject = await runAssistantOnThread(
          openAiInstance,
          threadId,
          assistantId
        );

        // 8. Очікування відповіді
        // Цей цикл чекає поки OpenAI закінчить обробку і поверне статус.
        while (true) {
          // перевіряємо статус запуску кожні 2 секунди
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          runStatus = await getRunStatus(openAiInstance, threadId, runObject.id);
          if (runStatus.status === "completed" || runStatus.status === "failed") {
            break;
          }
        }

        // 9. Отримання відповіді
        const lastMessage = await getLastResponse(openAiInstance, threadId);
        console.log(`\n💬 Відповідь асистента: \n ${chalk.cyan.bold(lastMessage)}
      `);

        runCount += 1;
      }
    } else {
      // Responses API path
      vectorStoreId = await getVectorStoreId(openAiInstance, fileIds);

      console.log(`✔️ Id векторного сховища: ${chalk.grey.bold(vectorStoreId)}`);

      const responsesConfig = loadResponsesConfig();
      const instructions = getAssistantInstructionsText();
      const conversationHistory = initConversation();
      const attachments = buildFileSearchAttachments(fileIds);

      while (runCount < maxRuns) {
        const message = await askUserMessage();
        recordUserMessage(conversationHistory, message);

        const input = buildResponsesPrompt(
          conversationHistory,
          instructions
        );

        const response = await createResponse(
          openAiInstance,
          input,
          attachments,
          {
            model: responsesConfig.model,
            temperature: responsesConfig.temperature,
            vectorStoreId,
          }
        );

        const completedResponse = await awaitResponseCompletion(
          openAiInstance,
          response,
          pollInterval
        );

        logUsageFromResponse(completedResponse);

        const assistantReply = extractAssistantReply(completedResponse);
        recordAssistantMessage(conversationHistory, assistantReply);

        console.log(`\n💬 Відповідь асистента: \n ${chalk.cyan.bold(assistantReply)}
      `);

        runCount += 1;
      }
    }
  } catch (error) {
    console.error(chalk.red("Помилка: "), error);
  }
  return;
}

/**
 * @example "Які предмети у середу для групи ...?";
 * @returns {Promise<string>} The user message.
 */
// Ця функція отримує текст від користувача або бере його з TEST_USER_MESSAGE.
async function askUserMessage() {
  if (process.env.TEST_USER_MESSAGE) {
    // У тестах беремо заготовлений текст і видаляємо його після використання.
    const message = process.env.TEST_USER_MESSAGE;
    delete process.env.TEST_USER_MESSAGE;
    return message;
  }
  // Створюємо обіцянку, щоб дочекатися введення тексту з консолі.
  return new Promise((resolve) => {
    process.stdout.write(
      chalk.green.bold("\n Введіть повідомлення для асистента: ")
    );
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (data) => {
      resolve(data.trim());
    });
  });
}

await main(openai);
