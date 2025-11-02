import chalk from "chalk";
import { getFileId, getVectorStoreId } from "../file_manager.js";
import {
  getAssistantId,
  updateAssistantWithVectorStore,
} from "../assistant_manager.js";
import {
  getThreadId,
  addMessageToThread,
  getLastResponse,
} from "../thread_manager.js";
import { runAssistantOnThread, getRunStatus } from "../run_manager.js";
import { askUserMessage } from "./user_io.js";

// Виконує повний цикл спілкування через Assistants API.
export async function runAssistantsFlow(openAiInstance, options) {
  const { maxRuns, pollInterval } = options;
  let runCount = 0;
  let runStatus;

  // 1. Завантажуємо файл і пам'ятаємо його ID.
  const fileId = await getFileId(openAiInstance, process.env.FILE_NAME);
  const fileIds = [fileId];

  console.log(`✔️ Id файлу: ${chalk.grey.bold(fileId)}`);

  // 2. Знаходимо або створюємо асистента.
  const assistantId = await getAssistantId(
    openAiInstance,
    process.env.ASSISTANT_NAME
  );

  console.log(`✔️ Id асистента: ${chalk.grey.bold(assistantId)}`);

  // 3. Створюємо векторне сховище на основі файлу.
  const vectorStoreId = await getVectorStoreId(openAiInstance, fileIds);

  console.log(`✔️ Id векторного сховища: ${chalk.grey.bold(vectorStoreId)}`);

  // 4. Підключаємо векторне сховище до асистента.
  await updateAssistantWithVectorStore(
    openAiInstance,
    assistantId,
    vectorStoreId
  );

  // 5. Створюємо новий тред для цієї сесії.
  const threadId = await getThreadId(openAiInstance);

  console.log(`✔️ Id треду: ${chalk.grey.bold(threadId)}`);

  while (runCount < maxRuns) {
    // 6. Отримуємо повідомлення користувача.
    const message = await askUserMessage();
    // 7. Додаємо його в історію треду.
    await addMessageToThread(openAiInstance, threadId, message);

    // 8. Запускаємо асистента для обробки запиту.
    const runObject = await runAssistantOnThread(
      openAiInstance,
      threadId,
      assistantId
    );

    while (true) {
      // 9. Перевіряємо статус run з паузою.
      await waitFor(pollInterval);
      runStatus = await getRunStatus(openAiInstance, threadId, runObject.id);
      if (runStatus.status === "completed" || runStatus.status === "failed") {
        break;
      }
    }

    // 10. Зчитуємо останню відповідь і показуємо її в консолі.
    const lastMessage = await getLastResponse(openAiInstance, threadId);
    console.log(`\n💬 Відповідь асистента: \n ${chalk.cyan.bold(lastMessage)}
      `);

    runCount += 1;
  }
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
