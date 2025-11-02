import chalk from "chalk";

// Responses API helper: створює локальну історію листування.
export function initConversation() {
  console.log(
    chalk.green("✔️ Розмову ініціалізовано (Response API)")
  );
  return [];
}

// Responses API helper: додає повідомлення користувача до історії.
export function recordUserMessage(history, message) {
  if (!Array.isArray(history)) {
    throw new Error("❌ Історія розмови має бути масивом.");
  }
  history.push({
    role: "user",
    content: message,
  });
  console.log(
    chalk.green("✔️ Повідомлення користувача додано до локальної історії (Response API)")
  );
}

// Responses API helper: додає відповідь асистента до історії.
export function recordAssistantMessage(history, message) {
  if (!Array.isArray(history)) {
    throw new Error("❌ Історія розмови має бути масивом.");
  }
  history.push({
    role: "assistant",
    content: message,
  });
  console.log(
    chalk.green("✔️ Відповідь асистента додано до локальної історії (Response API)")
  );
}

// Responses API helper: додає системне повідомлення до історії (для контексту).
export function recordSystemMessage(history, message) {
  if (!Array.isArray(history)) {
    throw new Error("❌ Історія розмови має бути масивом.");
  }
  history.push({
    role: "system",
    content: message,
  });
  console.log(
    chalk.green("✔️ Системний контекст додано до локальної історії (Response API)")
  );
}

