import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  fromBlob: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("server-only", () => ({}));

vi.mock("@huggingface/transformers", () => ({
  RawImage: { fromBlob: mocks.fromBlob },
}));

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createRequest({
  authenticated = true,
  mode = "image-to-video",
  image = new File([png], "photo.png", { type: "image/png" }),
  prompt = "Slow camera push-in",
  resolution = "720p",
}: {
  authenticated?: boolean;
  mode?: string;
  image?: File | null;
  prompt?: string;
  resolution?: string;
} = {}) {
  const formData = new FormData();
  formData.set("mode", mode);
  formData.set("prompt", prompt);
  formData.set("aspectRatio", "16:9");
  formData.set("duration", "5");
  formData.set("resolution", resolution);
  if (image) formData.set("image", image);
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: "user-1" } : null },
        error: null,
      }),
    },
    rpc: vi.fn(),
  });
  return new NextRequest("http://localhost/api/generate-video", {
    method: "POST",
    body: formData,
  });
}

async function post(request: NextRequest) {
  const { POST } = await import("../src/app/api/generate-video/route");
  return POST(request);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.fromBlob.mockResolvedValue({ width: 256, height: 256 });
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/generate-video", () => {
  it("requires authentication", async () => {
    const response = await post(createRequest({ authenticated: false }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("rejects text mode without a prompt", async () => {
    const response = await post(
      createRequest({ mode: "text-to-video", image: null, prompt: "  " }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "PROMPT_REQUIRED" },
    });
  });

  it("accepts prompt-only text mode and reports the missing provider", async () => {
    const response = await post(
      createRequest({
        mode: "text-to-video",
        image: null,
        prompt: "A cinematic mountain sunrise",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VIDEO_SERVICE_NOT_CONFIGURED" },
    });
    expect(mocks.fromBlob).not.toHaveBeenCalled();
  });

  it("returns not configured for valid input and does not charge credits", async () => {
    const request = createRequest();
    const response = await post(request);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: "VIDEO_SERVICE_NOT_CONFIGURED",
        message: "Video generation service is not configured.",
      },
    });
    const client = await mocks.createSupabaseServerClient.mock.results[0].value;
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("rejects an unsupported resolution value", async () => {
    const response = await post(createRequest({ resolution: "1440p" }));

    expect(response.status).toBe(400);
    expect(mocks.fromBlob).not.toHaveBeenCalled();
  });
});

describe("GET /api/generate-video", () => {
  it("reports that no provider or resolutions are configured", async () => {
    const { GET } = await import("../src/app/api/generate-video/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { configured: false, supportedResolutions: [] },
    });
  });
});
