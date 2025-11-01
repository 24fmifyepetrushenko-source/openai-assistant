import chalk from "chalk";

// Responses API helper: будує вкладення файлів для запиту.
export function buildFileSearchAttachments(fileIds = []) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return [];
  }

  const attachments = fileIds.map((fileId) => ({
    file_id: fileId,
    tools: [{ type: "file_search" }],
  }));

  console.log(
    chalk.green(
      `✔️ Файли прикріплено для Responses API: ${chalk.grey.bold(
        fileIds.join(", ")
      )} (Response API)`
    )
  );

  return attachments;
}
