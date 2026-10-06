# Studio AI Assistant

The Studio assistant uses Gemini's `generateContent` API through the authenticated server route `POST /api/assistant/chat`. The browser never receives the provider key.

Configure these server environment variables in Render:

- `GEMINI_API_KEY` (required): a Google AI Studio Gemini API key. Add it as a secret in the service environment; do not use a `NEXT_PUBLIC_` variable.
- `GEMINI_MODEL` (optional): model name; defaults to `gemini-2.5-flash`.

After changing service environment variables, redeploy the service. If `GEMINI_API_KEY` is missing, the assistant returns a setup message and does not call Gemini.
