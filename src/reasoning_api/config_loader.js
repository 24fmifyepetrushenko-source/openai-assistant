import chalk from "chalk";

const REASONING_EFFORT_VALUES = new Set(["low", "medium", "high"]);
const REASONING_SUMMARY_VALUES = new Set(["auto", "concise", "detailed"]);

function isReasoningModel(model) {
  return typeof model === "string" && model.trim().toLowerCase().startsWith("o");
}

function parseIsReasoningFlag() {
  const raw = process.env.IS_REASONING?.trim().toLowerCase();
  if (!raw) return undefined;

  if (["true", "1", "yes", "on"].includes(raw)) return true;
  if (["false", "0", "no", "off"].includes(raw)) return false;

  console.log(
    chalk.yellow(
      `Unknown IS_REASONING value "${raw}". Falling back to automatic behavior (Response API)`
    )
  );

  return undefined;
}

function parseReasoningEffort() {
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();

  if (!effort) {
    return undefined;
  }

  if (!REASONING_EFFORT_VALUES.has(effort)) {
    console.log(
      chalk.yellow(
        `Unknown OPENAI_REASONING_EFFORT=${effort}. Skipping reasoning effort (Response API)`
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
        `Unknown OPENAI_REASONING_SUMMARY=${summary}. Skipping reasoning summary (Response API)`
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
        `OPENAI_MAX_OUTPUT_TOKENS must be a positive integer. Received "${rawValue}" (Response API)`
      )
    );
    return undefined;
  }

  return value;
}

export function loadResponsesConfig() {
  const model =
    process.env.OPENAI_RESPONSES_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim();

  if (!model) {
    throw new Error(
      chalk.red(
        "No model configured for Responses API. Set OPENAI_RESPONSES_MODEL or OPENAI_MODEL."
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

  const reasoningOverride = parseIsReasoningFlag();
  const supportsReasoning = isReasoningModel(model);

  // override=true => force on (if supported), override=false => allow auto, undefined => auto
  const reasoningEnabled =
    (reasoningOverride === true && supportsReasoning) ||
    (reasoningOverride !== true &&
      reasoningOverride !== false &&
      supportsReasoning) ||
    (reasoningOverride === false && supportsReasoning);

  const reasoningOptions = {};
  let reasoningSummary;

  if (reasoningEnabled) {
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
  if (reasoningEnabled) {
    temperature = undefined;
    if (rawTemperatureEnv !== undefined) {
      console.log(
        chalk.yellow(
          "OPENAI_TEMPERATURE is ignored for reasoning models (Response API)"
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
    isReasoningModel: supportsReasoning,
    reasoningEnabled,
    maxOutputTokens,
  };

  const configDetails = [`model ${chalk.grey.bold(result.model)}`];

  if (result.temperature !== undefined) {
    configDetails.push(`temperature ${chalk.grey.bold(result.temperature)}`);
  } else if (result.isReasoningModel) {
    configDetails.push("temperature omitted (reasoning model)");
  }

  if (result.reasoningEnabled) {
    configDetails.push("reasoning enabled");
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
      `Responses API configuration: ${configDetails.join(", ")} (Response API)`
    )
  );

  return result;
}
