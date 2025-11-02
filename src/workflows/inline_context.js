import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { recordSystemMessage } from "../reasoning_api/conversation.js";

// Читає файли та додає їх вміст як системні повідомлення.
export async function enrichConversationWithFiles(conversationHistory) {
  const fileNames = (process.env.FILE_NAME ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!fileNames.length) {
    return;
  }

  const folderName = process.env.FOLDER_NAME;
  try {
    for (const fileName of fileNames) {
      const filePath = path.resolve(`${folderName}/${fileName}`);
      const fileContent = await fs.readFile(filePath, "utf8");
      recordSystemMessage(
        conversationHistory,
        `Вміст файлу ${fileName}:\n${fileContent}`
      );
    }
  } catch (error) {
    console.error(
      chalk.red("❌ Не вдалося завантажити файли для інлайнового контексту: "),
      error
    );
    throw error;
  }
}
