import chalk from "chalk";

// Responses API helper: викликає Responses API та повертає первинний об'єкт відповіді.
export async function createResponse(
  openAiInstance,
  input,
  attachments,
  options
) {
  if (!openAiInstance) {
    throw new Error("❌ Не вказано екземпляр OpenAI для Responses API.");
  }
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("❌ Промпт для Responses API порожній.");
  }
  if (!options?.model) {
    throw new Error("❌ Не вказано модель для Responses API.");
  }

  const payload = {
    model: options.model,
    input,
    temperature: options.temperature,
  };

  if (attachments?.length) {
    payload.attachments = attachments;
  }

  if (options?.vectorStoreId) {
    payload.tool_resources = {
      file_search: {
        vector_store_ids: [options.vectorStoreId],
      },
    };
  }

  const response = await openAiInstance.responses.create(payload);

  console.log(
    chalk.green(
      `🚀 Надіслано запит через Responses API: ${chalk.grey.bold(
        response.id
      )} (Response API)`
    )
  );

  return response;
}

// Responses API helper: очікує завершення генерації відповіді.
export async function awaitResponseCompletion(
  openAiInstance,
  response,
  pollIntervalMs = 2000
) {
  if (!openAiInstance) {
    throw new Error("❌ Не вказано екземпляр OpenAI для Responses API.");
  }

  if (!response?.id) {
    throw new Error("❌ Відповідь Responses API не містить ID.");
  }

  let current = response;

  console.log(chalk.gray("⌛ Очікуємо завершення Responses API (Response API)"));

  while (
    ["in_progress", "queued", "generating"].includes(current.status ?? "")
  ) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    current = await openAiInstance.responses.retrieve(current.id);
  }

  if (current.status === "failed") {
    throw new Error(
      chalk.red(
        `❌ Responses API завершився з помилкою: ${current?.last_error || "невідомо"}`
      )
    );
  }

  console.log(
    chalk.green("✔️ Відповідь Responses API сформована (Response API)")
  );

  return current;
}

// Responses API helper: дістає текст відповіді асистента.
export function extractAssistantReply(response) {
  if (!response) {
    return "";
  }

  const textParts = [];

  const items = response.output ?? [];
  for (const item of items) {
    if (item?.content && Array.isArray(item.content)) {
      for (const chunk of item.content) {
        if (chunk?.type === "output_text" && chunk.text) {
          textParts.push(chunk.text);
        } else if (chunk?.type === "text" && chunk.text) {
          textParts.push(chunk.text);
        }
      }
    }
  }

  const reply = textParts.join("").trim();

  console.log(
    chalk.green("✔️ Отримано контент від Responses API (Response API)")
  );

  return reply;
}
