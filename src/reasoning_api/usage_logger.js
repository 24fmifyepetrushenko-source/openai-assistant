import chalk from "chalk";

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

function pickUsageValue(usage, keys) {
  for (const key of keys) {
    const value = coerceNumber(usage?.[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

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

// Responses API helper: виводить статистику використаних токенів.
export function logUsageFromResponse(response) {
  const usage = response?.usage;
  if (!usage) {
    return;
  }

  const inputTokens =
    pickUsageValue(usage, ["input_tokens", "prompt_tokens"]) ??
    sumTokenDetails(usage.input_token_details) ??
    sumTokenDetails(usage.prompt_tokens_details) ??
    0;

  const outputTokens =
    pickUsageValue(usage, ["output_tokens", "completion_tokens"]) ??
    sumTokenDetails(usage.output_token_details) ??
    sumTokenDetails(usage.completion_tokens_details) ??
    0;

  const totalTokens =
    pickUsageValue(usage, ["total_tokens"]) ?? inputTokens + outputTokens;

  console.log(
    chalk.grey(
      `${chalk.bold.underline("Використано токенів:")}
Вхідних (input): ${chalk.bold(inputTokens)}
Вихідних (output): ${chalk.bold(outputTokens)}
Всього: ${chalk.bold(totalTokens)} (Response API)`
    )
  );
}
