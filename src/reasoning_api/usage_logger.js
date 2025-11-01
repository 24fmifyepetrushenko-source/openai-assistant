import chalk from "chalk";

// Responses API helper: виводить статистику використаних токенів.
export function logUsageFromResponse(response) {
  const usage = response?.usage;
  if (!usage) {
    return;
  }

  console.log(
    chalk.grey(
      `${chalk.bold.underline("Використано токенів:")}
Вхідних (input): ${chalk.bold(usage.prompt_tokens ?? 0)}
Вихідних (output): ${chalk.bold(usage.completion_tokens ?? 0)}
Всього: ${chalk.bold(usage.total_tokens ?? 0)} (Response API)`
    )
  );
}
