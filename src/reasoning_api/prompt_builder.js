import chalk from "chalk";

// Responses API helper: формує форматований промпт для Responses API.
export function buildResponsesPrompt(history, instructions) {
  const input = [];

  if (instructions) {
    input.push({
      role: "system",
      content: [
        {
          type: "input_text",
          text: instructions,
        },
      ],
    });
  }

  for (const message of history) {
    if (!message?.content) {
      continue;
    }

    const isAssistant = message.role === "assistant";
    const contentType = isAssistant ? "output_text" : "input_text";

    input.push({
      role: message.role,
      content: [
        {
          type: contentType,
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
