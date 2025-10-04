import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

// Ця функція створює клієнта OpenAI або повертає мок для тестів.
export async function createOpenAIClient() {
  if (process.env.USE_MOCK_OPENAI === "true") {
    const module = await import("./testing/mock-openai.js");
    return new module.MockOpenAI();
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("❌ Не вказано OPENAI_API_KEY у змінних середовища.");
  }

  // Для коректного запуску через Codex Web потрібно налаштувати проксі.
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  // HttpsProxyAgent створює http.Agent з підтримкою HTTPS-проксі, щоб SDK одразу працював із системними налаштуваннями.
  // Якщо у мережі є проксі, налаштовуємо його, інакше працюємо напряму.
  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxyAgent && { httpAgent: proxyAgent }),
  });
}
