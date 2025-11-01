import chalk from "chalk";

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

  const temperatureEnv =
    process.env.OPENAI_TEMPERATURE ??
    "1";

  const temperature = Number.parseFloat(temperatureEnv);
  const isValidTemperature =
    Number.isFinite(temperature) && temperature >= 0 && temperature <= 2;

  const result = {
    model,
    temperature: isValidTemperature ? temperature : 1,
  };

  console.log(
    chalk.green(
      `✔️ Response API конфігурацію завантажено: модель ${chalk.grey.bold(
        result.model
      )}, температура ${chalk.grey.bold(result.temperature)} (Response API)`
    )
  );

  return result;
}
