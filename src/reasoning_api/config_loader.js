import chalk from "chalk";

const REASONING_EFFORT_VALUES = new Set(["low", "medium", "high"]);
const REASONING_SUMMARY_VALUES = new Set(["auto", "concise", "detailed"]);

function isReasoningModel(model) {
  return typeof model === "string" && model.trim().toLowerCase().startsWith("o");
}

function parseReasoningEffort() {
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();

  if (!effort) {
    return undefined;
  }

  if (!REASONING_EFFORT_VALUES.has(effort)) {
    console.log(
      chalk.yellow(
        `⚠️ Непідтримуване значення OPENAI_REASONING_EFFORT=${effort}. Використовується налаштування за замовчуванням (Response API)`
      )
    );
    return undefined;
  }

  return effort;
}

function parseReasoningSummary() {
  const summary = process.env.OPENAI_REASONING_SUMMARY?.trim().toLowerCase();

  if (!summary) {
    return undefined;
  }

  if (!REASONING_SUMMARY_VALUES.has(summary)) {
    console.log(
      chalk.yellow(
        `⚠️ Непідтримуване значення OPENAI_REASONING_SUMMARY=${summary}. Використовується налаштування за замовчуванням (Response API)`
      )
    );
    return undefined;
  }

  return summary;
}

function parseMaxOutputTokens() {
  const rawValue = process.env.OPENAI_MAX_OUTPUT_TOKENS?.trim();
  if (!rawValue) {
    return undefined;
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value <= 0) {
    console.log(
      chalk.yellow(
        `⚠️ OPENAI_MAX_OUTPUT_TOKENS повинно бути додатнім числом. Значення "${rawValue}" проігноровано (Response API)`
      )
    );
    return undefined;
  }

  return value;
}

// Responses API helper: зчитує налаштування моделі та температури.
export function loadResponsesConfig() {
  const model =
    process.env.OPENAI_RESPONSES_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim();

  if (!model) {
    throw new Error(
      chalk.red(
        "❌ Не вказано модель для Responses API. Додайте OPENAI_RESPONSES_MODEL або OPENAI_MODEL."
      )
    );
  }

  const rawTemperatureEnv = process.env.OPENAI_TEMPERATURE;
  const temperatureEnv = rawTemperatureEnv ?? "1";

  const parsedTemperature = Number.parseFloat(temperatureEnv);
  const isValidTemperature =
    Number.isFinite(parsedTemperature) &&
    parsedTemperature >= 0 &&
    parsedTemperature <= 2;

  const nonReasoningTemperature = isValidTemperature ? parsedTemperature : 1;

  const reasoningOptions = {};
  let reasoningSummary;

  if (isReasoningModel(model)) {
    const effort = parseReasoningEffort();
    reasoningSummary = parseReasoningSummary();

    if (effort) {
      reasoningOptions.effort = effort;
    }
    if (reasoningSummary) {
      reasoningOptions.summary = reasoningSummary;
    }
  }

  const maxOutputTokens = parseMaxOutputTokens();

  const hasReasoningOptions = Object.keys(reasoningOptions).length > 0;

  let temperature;
  if (isReasoningModel(model)) {
    temperature = undefined;
    if (rawTemperatureEnv !== undefined) {
      console.log(
        chalk.yellow(
          "⚠️ Параметр OPENAI_TEMPERATURE проігноровано: reasoning моделі не підтримують температуру (Response API)"
        )
      );
    }
  } else {
    temperature = nonReasoningTemperature;
  }

  const result = {
    model,
    temperature,
    reasoning: hasReasoningOptions ? reasoningOptions : undefined,
    isReasoningModel: isReasoningModel(model),
    maxOutputTokens,
  };

  const configDetails = [
    `модель ${chalk.grey.bold(result.model)}`,
  ];

  if (result.temperature !== undefined) {
    configDetails.push(`температура ${chalk.grey.bold(result.temperature)}`);
  } else if (result.isReasoningModel) {
    configDetails.push("температура недоступна для reasoning моделей");
  }

  if (result.isReasoningModel) {
    configDetails.push("reasoning model");

    if (reasoningOptions.effort) {
      configDetails.push(
        `reasoning effort ${chalk.grey.bold(reasoningOptions.effort)}`
      );
    }

    if (reasoningOptions.summary) {
      configDetails.push(
        `reasoning summary ${chalk.grey.bold(reasoningOptions.summary)}`
      );
    }
  }

  if (maxOutputTokens) {
    configDetails.push(
      `max_output_tokens ${chalk.grey.bold(maxOutputTokens)}`
    );
  }

  console.log(
    chalk.green(
      `✔️ Response API конфігурацію завантажено: ${configDetails.join(
        ", "
      )} (Response API)`
    )
  );

  return result;
}
