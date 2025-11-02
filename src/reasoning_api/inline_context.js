import fs from "fs/promises";
import path from "path";

// Responses API helper: читає файли та повертає текстовий контекст.
export async function loadInlineAttachmentContext(folderName, fileNames = []) {
  if (!folderName || !Array.isArray(fileNames) || !fileNames.length) {
    return [];
  }

  const contexts = [];

  for (const fileName of fileNames.map((name) => name?.trim()).filter(Boolean)) {
    const filePath = path.resolve(`${folderName}/${fileName}`);
    const fileContent = await fs.readFile(filePath, "utf8");
    contexts.push({
      fileName,
      content: fileContent,
    });
  }

  return contexts;
}
