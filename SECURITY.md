# Security

## Reporting a problem

Please report security problems privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for something that could put users at risk.

Include what you found, how to reproduce it and what you think the impact is.

## What to know before you deploy this

Volturiano Agent is built to run on your own machine for one person.

- **There is no login.** Anyone who can reach the server can use your model and sandbox keys through it. Do not expose it to the internet without adding authentication.
- **Keys stay on the server.** They are read from `.env` and never sent to the browser.
- **Generated code runs in a sandbox.** The agent writes and runs code inside E2B, not on your machine. Package installs are limited to an allow-list.
- **GitHub tokens are encrypted at rest** with `GITHUB_TOKEN_ENCRYPTION_KEY` (AES-256-GCM) before they are written to `.data/`.
- **Local data is plain JSON.** Prompts, chat history and generated files are stored unencrypted in `.data/`.
