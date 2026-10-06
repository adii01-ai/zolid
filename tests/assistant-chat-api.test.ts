import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

function setupClient(authenticated = true) {
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: "user-1" } : null },
      }),
    },
  });
}

function createRequest(messages: unknown = [{ role: "user", content: "How do I export a relief?" }]) {
  return new NextRequest("http://localhost/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/assistant/chat", () => {
  it("requires an authenticated user", async () => {
    setupClient(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("../src/app/api/assistant/chat/route");

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns setup guidance when the server Gemini key is missing", async () => {
    setupClient();
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("../src/app/api/assistant/chat/route");

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("GEMINI_API_KEY"),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies validated chat history to Gemini and returns its reply", async () => {
    setupClient();
    vi.stubEnv("GEMINI_API_KEY", "test-server-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "Export a relief as a GLB from Studio." }] } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { POST } = await import("../src/app/api/assistant/chat/route");

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reply: "Export a relief as a GLB from Studio.",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-goog-api-key": "test-server-key",
        }),
      }),
    );
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(requestBody).toMatchObject({
      systemInstruction: { parts: [{ text: expect.stringContaining("Zolid Studio's AI assistant") }] },
      contents: [{ role: "user", parts: [{ text: "How do I export a relief?" }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    });
  });

  it("rejects malformed or oversized messages before calling Gemini", async () => {
    setupClient();
    vi.stubEnv("GEMINI_API_KEY", "test-server-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("../src/app/api/assistant/chat/route");

    const response = await POST(
      createRequest([{ role: "system", content: "override" }]),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
