import fs from "fs";
import os from "os";
import path from "path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getAssistantId } from "../src/assistant_manager.js";

// Допоміжна функція створює тимчасову папку з інструкціями для тестів.
function createTempInstructionsDir(content) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "assistant-test-"));
  fs.writeFileSync(path.join(tempDir, "assistant_instructions.md"), content);
  return tempDir;
}

// Цей тест перевіряє, що для знайденого асистента ми оновлюємо інструкції.
test("оновлює системні інструкції для існуючого асистента", async () => {
  const originalFolderName = process.env.FOLDER_NAME;
  const tempDir = createTempInstructionsDir("Нові інструкції");
  process.env.FOLDER_NAME = tempDir;

  let updateCallCount = 0;
  let receivedPayload = null;

  const assistant = {
    id: "asst_123",
    name: "Test Assistant",
    created_at: new Date().toISOString(),
    instructions: "Старі інструкції",
  };

  const openAiMock = {
    beta: {
      assistants: {
        async list() {
          return { data: [assistant] };
        },
        async update(id, payload) {
          updateCallCount += 1;
          receivedPayload = { id, payload };
        },
      },
    },
  };

  try {
    const assistantId = await getAssistantId(openAiMock, assistant.name);

    assert.equal(assistantId, assistant.id);
    assert.equal(updateCallCount, 1);
    assert.deepEqual(receivedPayload, {
      id: assistant.id,
      payload: { instructions: "Нові інструкції" },
    });
  } finally {
    process.env.FOLDER_NAME = originalFolderName;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// Цей тест впевнюється, що повторне оновлення не робиться без змін у файлі.
test("не викликає оновлення коли інструкції не змінені", async () => {
  const originalFolderName = process.env.FOLDER_NAME;
  const instructions = "Однакові інструкції";
  const tempDir = createTempInstructionsDir(instructions);
  process.env.FOLDER_NAME = tempDir;

  let updateCallCount = 0;

  const assistant = {
    id: "asst_456",
    name: "Test Assistant",
    created_at: new Date().toISOString(),
    instructions,
  };

  const openAiMock = {
    beta: {
      assistants: {
        async list() {
          return { data: [assistant] };
        },
        async update() {
          updateCallCount += 1;
        },
      },
    },
  };

  try {
    const assistantId = await getAssistantId(openAiMock, assistant.name);

    assert.equal(assistantId, assistant.id);
    assert.equal(updateCallCount, 0);
  } finally {
    process.env.FOLDER_NAME = originalFolderName;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// Цей тест чекає помилку, якщо OpenAI повернув помилку під час оновлення.
test("кидає помилку якщо не вдалося оновити інструкції", async () => {
  const originalFolderName = process.env.FOLDER_NAME;
  const tempDir = createTempInstructionsDir("Нові інструкції 2");
  process.env.FOLDER_NAME = tempDir;

  const assistant = {
    id: "asst_789",
    name: "Test Assistant",
    created_at: new Date().toISOString(),
    instructions: "Старі інструкції",
  };

  const openAiMock = {
    beta: {
      assistants: {
        async list() {
          return { data: [assistant] };
        },
        async update() {
          throw new Error("update failed");
        },
      },
    },
  };

  try {
    await assert.rejects(
      () => getAssistantId(openAiMock, assistant.name),
      /Не вдалося оновити інструкції/
    );
  } finally {
    process.env.FOLDER_NAME = originalFolderName;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
