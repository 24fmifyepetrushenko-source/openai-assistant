import chalk from "chalk";

// Ця функція намагається перетворити будь-яке значення на число.
// Якщо значення вже число або рядок з числом, ми його повертаємо, інакше – undefined.
function coerceNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// За допомогою цієї функції ми перебираємо можливі назви полів і повертаємо перше валідне число.
function pickUsageValue(usage, keys) {
  for (const key of keys) {
    const value = coerceNumber(usage?.[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// Тут ми складаємо всі значення з вкладених об'єктів типу {cached_tokens: 10, text_tokens: 5}.
// Якщо знаходимо числа – підсумовуємо, якщо нічого нема – повертаємо undefined.
function sumTokenDetails(details) {
  if (details == null) {
    return undefined;
  }

  const numeric = coerceNumber(details);
  if (numeric !== undefined) {
    return numeric;
  }

  if (typeof details === "object") {
    let total = 0;
    let found = false;

    for (const value of Object.values(details)) {
      const nested = sumTokenDetails(value);
      if (nested !== undefined) {
        total += nested;
        found = true;
      }
    }

    if (found) {
      return total;
    }
  }

  return undefined;
}

// Основна функція: читає статис­тику з відповіді API та виводить її в консоль.
// Пояснюємо студентам першого курсу: ми хочемо показати, скільки токенів витратили на запит і відповідь.
export function logUsageFromResponse(response) {
  const usage = response?.usage;
  if (!usage) {
    return;
  }

  // Рахуємо токени, які пішли на вхід (тобто наш запит до моделі).
  const inputTokens =
    pickUsageValue(usage, ["input_tokens", "prompt_tokens"]) ??
    sumTokenDetails(usage.input_token_details) ??
    sumTokenDetails(usage.prompt_tokens_details) ??
    0;

  // Рахуємо токени, які модель витратила на відповідь.
  const outputTokens =
    pickUsageValue(usage, ["output_tokens", "completion_tokens"]) ??
    sumTokenDetails(usage.output_token_details) ??
    sumTokenDetails(usage.completion_tokens_details) ??
    0;

  // Деякі моделі (reasoning) показують окремі токени на "міркування" — врахуємо їх теж.
  const rawReasoningTokens =
    pickUsageValue(usage, ["reasoning_tokens"]) ??
    sumTokenDetails(usage.reasoning_tokens_details);

  const hasReasoningTokens =
    rawReasoningTokens !== undefined && Number.isFinite(rawReasoningTokens);

  const reasoningTokens = hasReasoningTokens ? rawReasoningTokens : 0;

  // Визначаємо загальну суму токенів, використавши готове поле або склавши частини вручну.
  const totalTokens =
    pickUsageValue(usage, ["total_tokens"]) ??
    inputTokens +
      outputTokens +
      (hasReasoningTokens ? reasoningTokens : 0);

  // Готуємо рядки для красивого виводу у консоль.
  const lines = [
    chalk.bold.underline("Використано токенів:"),
    `Вхідних (input): ${chalk.bold(inputTokens)}`,
    `Вихідних (output): ${chalk.bold(outputTokens)}`,
  ];

  if (hasReasoningTokens) {
    lines.push(`Reasoning: ${chalk.bold(reasoningTokens)}`);
  }

  lines.push(`Всього: ${chalk.bold(totalTokens)} (Response API)`);

  console.log(chalk.grey(lines.join("\n")));
}
