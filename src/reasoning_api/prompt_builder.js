import chalk from "chalk";

// Responses API helper: формує форматований промпт для Responses API.
export function buildResponsesPrompt(history, instructions) {
  const input = [];

  if (instructions) {
    input.push({
      role: "system",
      content: [
        {
          type: "text",
          text: instructions,
        },
      ],
    });
  }

  for (const message of history) {
    if (!message?.content) {
      continue;
    }

    input.push({
      role: message.role,
      content: [
        {
          type: "text",
          text: message.content,
        },
      ],
    });
  }

  console.log(
    chalk.green(
      `✔️ Побудовано промпт для Responses API: ${chalk.grey.bold(
        input.length
      )} повідомлень (Response API)`
    )
  );

  return input;
}
