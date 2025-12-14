# OpenAI Assistant

Console assistant built on the OpenAI Assistants API for learning and experimentation. It uploads a file, builds a vector store, creates an assistant, and chats in your terminal using that file as context.

## What it does

- Uploads local files to OpenAI and builds a vector store for retrieval.
- Creates or reuses an assistant with instructions from `assistant_instructions.md`.
- Creates a new thread per run, adds your console messages, and runs the assistant on that thread.
- Prints responses that stay grounded in your uploaded file(s).

## Project structure

- `src/index.js` - entrypoint orchestrating setup and the console loop.
- `src/assistant_manager.js` - finds or creates the assistant and attaches vector stores.
- `src/file_manager.js` - uploads files and manages vector stores (auto-delete in 7 days by default).
- `src/thread_manager.js` - creates threads, posts user messages, reads the last assistant reply.
- `src/run_manager.js` - starts runs on a thread and polls their status.
- `src/utils.js` - date formatting helpers.
- `files/` - place your documents and `assistant_instructions.md`.

## Setup

1. Install dependencies
   ```bash
   git clone https://github.com/yourusername/openai-assistant.git
   cd openai-assistant
   npm install
   ```
2. Prepare files
   - Put your source document(s) in `files/`.
   - Create `files/assistant_instructions.md` describing the assistant's role and response style.
3. Configure environment
   - Copy `.env.examle` to `.env`.
   - Fill values (filenames include extensions):
     - `OPENAI_API_KEY` - your OpenAI API key.
     - `FILE_NAME` - file in `files/` to upload (for example `schedule.docx`).
     - `FOLDER_NAME` - folder with your files (default `files`).
     - `ASSISTANT_NAME` - identifier for reuse (for example `Schedule Assistant`).
     - `OPENAI_MODEL` - model name (for example `gpt-4o-mini-2024-07-18`).
     - `OPENAI_TEMPERATURE` - response creativity (0-2).
     - `VECTOR_STORE_NAME` - optional; if omitted a dated name is generated.

## How it works (reasoning flow)

1. Read environment config.
2. Upload the target file if not already present; create a vector store (old store with the same name is removed).
3. Find or create the assistant with the `file_search` tool and your instructions attached.
4. Attach the vector store to the assistant.
5. Create a new thread for the session.
6. Loop: read your console input -> add to thread -> run assistant -> poll until complete -> print the last reply.

## Running

```bash
npm start
```

Then type messages in the console; the assistant will answer using the uploaded file as context.

## Notes and limits

- Only one vector store can be attached to an assistant or thread at a time; old stores with the same name are cleared before creation.
- Vector stores default to auto-delete after 7 days to control storage costs.
- The legacy Assistants API this project uses is scheduled for retirement on August 26, 2026; plan migrations accordingly.

## Contributing

1. Fork the repository.
2. Create a branch (`git checkout -b feature-branch`).
3. Make changes and commit (`git commit -m "Add feature"`).
4. Push (`git push origin feature-branch`) and open a pull request.
