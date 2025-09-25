import path from "path";

function createId(prefix, store) {
  const next = store.nextId + 1;
  store.nextId = next;
  return `${prefix}_${next}`;
}

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

export class MockOpenAI {
  constructor() {
    this.state = {
      files: [],
      vectorStores: [],
      assistants: [],
      threads: new Map(),
      runs: new Map(),
      nextId: 0,
    };

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

    this.beta = {
      vectorStores: {
        list: async () => ({ data: [...this.state.vectorStores] }),
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
        list: async () => ({ data: [...this.state.assistants] }),
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
        create: async () => {
          const id = createId("thread", this.state);
          this.state.threads.set(id, {
            id,
            messages: [],
          });
          return { id };
        },
        messages: {
          create: async (threadId, messageObject) => {
            const thread = this._getThread(threadId);
            thread.messages.push({
              id: createId("msg", this.state),
              role: messageObject.role,
              content: mapContent(messageObject.content),
              created_at: Math.floor(Date.now() / 1000),
            });
          },
          list: async (threadId) => {
            const thread = this._getThread(threadId);
            return {
              data: thread.messages.map((message) => ({ ...message })),
            };
          },
        },
        runs: {
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
  }

  _getThread(threadId) {
    const thread = this.state.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }
    return thread;
  }
}
