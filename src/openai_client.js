import OpenAI from "openai";

export async function createOpenAIClient() {
  if (process.env.USE_MOCK_OPENAI === "true") {
    const module = await import("./testing/mock-openai.js");
    return new module.MockOpenAI();
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("❌ Не вказано OPENAI_API_KEY у змінних середовища.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
