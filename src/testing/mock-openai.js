import path from "path";

// Створює новий унікальний ID із префіксом для тестових об'єктів.
function createId(prefix, store) {
  const next = store.nextId + 1;
  store.nextId = next;
  return `${prefix}_${next}`;
}

// Перетворює текст у формат, який очікує OpenAI для повідомлень.
function mapContent(content) {
  if (Array.isArray(content)) {
    return content;
  }

  return [
    {
      type: "text",
      text: { value: content },
    },
  ];
}

// Цей клас підміняє реальний OpenAI у тестах і поводиться дуже схоже.
export class MockOpenAI {
  constructor() {
    // Зберігаємо внутрішній стан, щоб імітувати файли, треди та запуски.
    this.state = {
      files: [],
      vectorStores: [],
      assistants: [],
      threads: new Map(),
      runs: new Map(),
      responses: new Map(),
      nextId: 0,
    };

    // Методи для роботи з файлами у моковому режимі.
    this.files = {
      list: async () => ({ data: [...this.state.files] }),
      create: async ({ file }) => {
        const id = createId("file", this.state);
        const filename = path.basename(file.path ?? "mock-file.txt");
        const newFile = {
          id,
          filename,
          created_at: Math.floor(Date.now() / 1000),
        };
        this.state.files.push(newFile);
        return newFile;
      },
    };

    // Блок beta містить підмножини API як у справжньому SDK.
    this.beta = {
      vectorStores: {
        // Повертаємо список штучних векторних сховищ.
        list: async () => ({ data: [...this.state.vectorStores] }),
        // Створюємо нове сховище та зберігаємо його в стані.
        create: async ({ name, file_ids, expires_after }) => {
          const id = createId("vs", this.state);
          const vectorStore = {
            id,
            name,
            file_ids,
            created_at: Math.floor(Date.now() / 1000),
            expires_after,
          };
          this.state.vectorStores.push(vectorStore);
          return vectorStore;
        },
        del: async (vectorStoreId) => {
          this.state.vectorStores = this.state.vectorStores.filter(
            (vectorStore) => vectorStore.id !== vectorStoreId
          );
        },
      },
      assistants: {
        // Повертаємо список створених тестових асистентів.
        list: async () => ({ data: [...this.state.assistants] }),
        // Створюємо нового асистента з потрібними параметрами.
        create: async ({ name, instructions, model, tools, temperature }) => {
          const id = createId("asst", this.state);
          const assistant = {
            id,
            name,
            instructions,
            model,
            tools,
            temperature,
            created_at: Math.floor(Date.now() / 1000),
          };
          this.state.assistants.push(assistant);
          return assistant;
        },
        update: async (assistantId, payload) => {
          this.state.assistants = this.state.assistants.map((assistant) =>
            assistant.id === assistantId
              ? { ...assistant, tool_resources: payload.tool_resources }
              : assistant
          );
        },
      },
      threads: {
        // Створюємо новий тред і додаємо його до карти.
        create: async () => {
          const id = createId("thread", this.state);
          this.state.threads.set(id, {
            id,
            messages: [],
          });
          return { id };
        },
        messages: {
          // Додаємо нове повідомлення у тред.
          create: async (threadId, messageObject) => {
            const thread = this._getThread(threadId);
            thread.messages.push({
              id: createId("msg", this.state),
              role: messageObject.role,
              content: mapContent(messageObject.content),
              created_at: Math.floor(Date.now() / 1000),
            });
          },
          // Повертаємо копії всіх повідомлень у треді.
          list: async (threadId) => {
            const thread = this._getThread(threadId);
            return {
              data: thread.messages.map((message) => ({ ...message })),
            };
          },
        },
        runs: {
          // Створюємо run і запам'ятовуємо, що він очікує відповідь.
          create: async (threadId, { assistant_id }) => {
            const runId = createId("run", this.state);
            this.state.runs.set(runId, {
              id: runId,
              threadId,
              assistantId: assistant_id,
              polls: 0,
            });
            return { id: runId };
          },
          // Повертаємо статус run і за потреби створюємо мокову відповідь асистента.
          retrieve: async (threadId, runId) => {
            const run = this.state.runs.get(runId);
            if (!run) {
              throw new Error(`Run ${runId} not found`);
            }

            run.polls += 1;

            if (run.polls < 2) {
              return { status: "in_progress" };
            }

            const thread = this._getThread(threadId);
            const hasAssistantMessage = thread.messages.some(
              (message) => message.role === "assistant"
            );

            if (!hasAssistantMessage) {
              // Якщо асистент ще не відповів, генеруємо простий мокований текст.
              const lastUserMessage = [...thread.messages]
                .reverse()
                .find((message) => message.role === "user");
              const userText =
                lastUserMessage?.content?.[0]?.text?.value ?? "";

              thread.messages.push({
                id: createId("msg", this.state),
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: {
                      value: `Mocked assistant response to: ${userText}`,
                    },
                  },
                ],
                created_at: Math.floor(Date.now() / 1000),
              });
            }

            return {
              status: "completed",
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            };
          },
        },
      },
    };

    // Responses API mock для тестів.
    this.responses = {
      create: async (payload) => {
        const id = createId("resp", this.state);
        const responseRecord = {
          id,
          status: "in_progress",
          polls: 0,
          input: payload.input,
          usage: {
            prompt_tokens: 12,
            completion_tokens: 6,
            total_tokens: 18,
          },
        };
        this.state.responses.set(id, responseRecord);
        return { ...responseRecord };
      },
      retrieve: async (responseId) => {
        const stored = this.state.responses.get(responseId);
        if (!stored) {
          throw new Error(`Response ${responseId} not found`);
        }

        stored.polls += 1;

        if (stored.polls >= 2) {
          if (!stored.output) {
            const messages = Array.isArray(stored.input)
              ? stored.input
              : [];
            const lastUserMessage = [...messages]
              .reverse()
              .find((message) => message.role === "user");
            const userText =
              lastUserMessage?.content?.[0]?.text ??
              lastUserMessage?.content?.[0]?.text?.value ??
              "";

            stored.output = [
              {
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: `Mocked Responses API reply to: ${userText}`,
                  },
                ],
              },
            ];
          }
          stored.status = "completed";
        }

        return { ...stored };
      },
    };
  }

  // Повертаємо тред зі сховища стану або кидаємо помилку, якщо його немає.
  _getThread(threadId) {
    const thread = this.state.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }
    return thread;
  }
}
