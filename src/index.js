import chalk from "chalk";
import { config as dotEnvConfig } from "dotenv";
import { createOpenAIClient } from "./openai_client.js";
import { runAssistantsFlow } from "./workflows/assistants_flow.js";
import { runResponsesFlow } from "./workflows/responses_flow.js";

dotEnvConfig({ path: ".env" });
const openai = await createOpenAIClient();

async function main(openAiInstance) {
  const settings = buildRuntimeSettings();
  const useResponsesApi = settings.useResponsesApi;

  // Обираємо сценарій: класичний Assistants чи сучасний Responses.
  try {
    if (!useResponsesApi) {
      await runAssistantsFlow(openAiInstance, settings);
    } else {
      await runResponsesFlow(openAiInstance, settings);
    }
  } catch (error) {
    console.error(chalk.red("Помилка: "), error);
  }
}

function buildRuntimeSettings() {
  const maxRunsEnv = Number.parseInt(process.env.MAX_RUNS ?? "", 10);
  const pollIntervalEnv = Number.parseInt(
    process.env.POLL_INTERVAL_MS ?? "2000",
    10
  );

  return {
    useResponsesApi:
      String(process.env.RESPONSE_API ?? "").toLowerCase() === "true",
    maxRuns:
      Number.isFinite(maxRunsEnv) && maxRunsEnv > 0 ? maxRunsEnv : Infinity,
    pollInterval:
      Number.isFinite(pollIntervalEnv) && pollIntervalEnv > 0
        ? pollIntervalEnv
        : 2000,
  };
}

await main(openai);
