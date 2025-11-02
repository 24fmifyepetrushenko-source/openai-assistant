import chalk from "chalk";
import { getFileId, getVectorStoreId } from "../file_manager.js";
import { getAssistantInstructionsText } from "../assistant_manager.js";
import { loadResponsesConfig } from "../reasoning_api/config_loader.js";
import {
  initConversation,
  recordUserMessage,
  recordAssistantMessage,
  recordSystemMessage,
} from "../reasoning_api/conversation.js";
import { buildResponsesPrompt } from "../reasoning_api/prompt_builder.js";
import { buildFileSearchAttachments } from "../reasoning_api/attachments.js";
import {
  createResponse,
  awaitResponseCompletion,
  extractAssistantReply,
} from "../reasoning_api/response_runner.js";
import { logUsageFromResponse } from "../reasoning_api/usage_logger.js";
import { loadInlineAttachmentContext } from "../reasoning_api/inline_context.js";
import { askUserMessage } from "./user_io.js";

// Виконує діалог через Responses API, додаючи текстові вкладення вручну.
export async function runResponsesFlow(openAiInstance, options) {
  const { maxRuns, pollInterval } = options;
  let runCount = 0;

  // 1. Завантажуємо файл і отримуємо його ID.
  const fileId = await getFileId(openAiInstance, process.env.FILE_NAME);
  const fileIds = [fileId];

  console.log(`✔️ Id файлу: ${chalk.grey.bold(fileId)}`);

  // 2. Створюємо векторне сховище для цього файлу.
  const vectorStoreId = await getVectorStoreId(openAiInstance, fileIds);

  console.log(`✔️ Id векторного сховища: ${chalk.grey.bold(vectorStoreId)}`);

  // 3. Готуємо налаштування моделі й початковий стан розмови.
  const responsesConfig = loadResponsesConfig();
  const instructions = getAssistantInstructionsText();
  const conversationHistory = initConversation();
  const attachments = buildFileSearchAttachments(fileIds);

  const fileNamesForInline = (process.env.FILE_NAME ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (fileNamesForInline.length) {
    try {
      // 4. Додаємо вміст файлів як системний контекст.
      const inlineContexts = await loadInlineAttachmentContext(
        process.env.FOLDER_NAME,
        fileNamesForInline
      );
      inlineContexts.forEach(({ fileName, content }) => {
        recordSystemMessage(
          conversationHistory,
          `Вміст файлу ${fileName}:\n${content}`
        );
      });
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Не вдалося завантажити файли для інлайнового контексту: "
        ),
        error
      );
      throw error;
    }
  }

  while (runCount < maxRuns) {
    // 5. Зчитуємо повідомлення користувача.
    const message = await askUserMessage();
    recordUserMessage(conversationHistory, message);

    // 6. Формуємо входи для Responses API.
    const input = buildResponsesPrompt(conversationHistory, instructions);

    // 7. Запускаємо модель та очікуємо завершення.
    const response = await createResponse(openAiInstance, input, attachments, {
      model: responsesConfig.model,
      temperature: responsesConfig.temperature,
      vectorStoreId,
    });

    const completedResponse = await awaitResponseCompletion(
      openAiInstance,
      response,
      pollInterval
    );

    // 8. Логування використаних токенів.
    logUsageFromResponse(completedResponse);

    // 9. Читаємо відповідь і додаємо її до історії.
    const assistantReply = extractAssistantReply(completedResponse);
    recordAssistantMessage(conversationHistory, assistantReply);

    // 10. Виводимо відповідь у консоль.
    console.log(`\n💬 Відповідь асистента: \n ${chalk.cyan.bold(assistantReply)}
      `);

    runCount += 1;
  }
}
