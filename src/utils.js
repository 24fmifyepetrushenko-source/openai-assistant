/**
 * format date to string like "31 Jan 2024, 15:30"
 * @param {number} timeStampInSec - timestamp in seconds (python format, OpenAI API format)
 * @returns {string} formatted date
 * @example formatDate(1739641153) // "31 Jan 2024, 15:30"
 * */
// Ця функція перетворює час з секундів у красивий текст для логу.
export function formatDate(timeStampInSec) {
  const correctedDate = new Date(timeStampInSec * 1000);
  return `${correctedDate.getDate()} ${correctedDate.toLocaleString("default", {
    month: "short",
  })} ${correctedDate.getFullYear()}, ${correctedDate.getHours()}:${correctedDate.getMinutes()}`;
}

/**
 * Checks whether the thinking (reasoning) mode is enabled via environment variable.
 * @returns {boolean} `true` when USE_THINKING_MODE is explicitly set to "true" (case-insensitive).
 */
export function isThinkingModeEnabled() {
  return (process.env.USE_THINKING_MODE ?? "").toLowerCase() === "true";
}
