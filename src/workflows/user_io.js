import chalk from "chalk";

const NEWLINE_PROMPT = "\n Введіть повідомлення для асистента: ";

// Отримує від користувача або з середовища текст запиту.
export async function askUserMessage() {
  if (process.env.TEST_USER_MESSAGE) {
    const message = process.env.TEST_USER_MESSAGE;
    delete process.env.TEST_USER_MESSAGE;
    return message;
  }

  return new Promise((resolve) => {
    process.stdout.write(chalk.green.bold(NEWLINE_PROMPT));
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (data) => {
      resolve(data.trim());
    });
  });
}
