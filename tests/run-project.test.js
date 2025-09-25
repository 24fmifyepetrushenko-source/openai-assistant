import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { test } from "node:test";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

test(
  "CLI запускається та повертає реальну відповідь від OpenAI",
  { timeout: 120_000 },
  async () => {
    assert.ok(
      process.env.OPENAI_API_KEY,
      "Тест потребує реального OPENAI_API_KEY у змінних середовища"
    );

    const env = {
      ...process.env,
      NODE_ENV: "test",
      MAX_RUNS: "1",
      POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS ?? "1000",
      TEST_USER_MESSAGE: process.env.TEST_USER_MESSAGE ?? "Привіт, як справи?",
      FILE_NAME: process.env.FILE_NAME ?? "schedule_test_1.md",
      FOLDER_NAME: process.env.FOLDER_NAME ?? "files",
      ASSISTANT_NAME: process.env.ASSISTANT_NAME ?? "Test Assistant",
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE ?? "0.2",
      VECTOR_STORE_NAME:
        process.env.VECTOR_STORE_NAME ?? "test-vector-store-real-api",
    };

    const child = spawn("node", ["src/index.js"], {
      cwd: projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    const sanitizedOutput = output.replace(ANSI_REGEX, "");

    assert.match(
      sanitizedOutput,
      /✔️ Id файлу:|Файл "/,
      "Очікуємо, що файл буде знайдено або створено"
    );
    assert.ok(
      sanitizedOutput.includes("💬 Відповідь асистента"),
      "Лог повинен містити блок із відповіддю"
    );

    const responseSection = sanitizedOutput
      .split("💬 Відповідь асистента:")
      .slice(1)
      .join("");
    const assistantMessage = responseSection
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    assert.ok(
      assistantMessage && assistantMessage.length > 0,
      "Асистент має повернути текст відповіді"
    );
    assert.ok(
      !assistantMessage?.includes("Mocked assistant response"),
      "Очікуємо реальну відповідь, а не мок"
    );
  }
);
