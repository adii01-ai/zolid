# Studio AI Assistant

The Studio assistant uses Groq's OpenAI-compatible chat completions API through the authenticated server route `POST /api/assistant/chat`. The browser never receives the provider key.

Configure these server environment variables in Render:

- `GROQ_API_KEY` (required): a Groq API key. Add it as a secret in the service environment; do not use a `NEXT_PUBLIC_` variable.
- `GROQ_MODEL` (optional): model name; defaults to `llama-3.3-70b-versatile`.

After changing service environment variables, redeploy the service. If `GROQ_API_KEY` is missing, the assistant returns a setup message and does not call Groq.
