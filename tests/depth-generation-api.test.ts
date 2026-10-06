import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  fromBlob: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@huggingface/transformers", () => ({
  RawImage: { fromBlob: mocks.fromBlob },
}));

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const reservationId = "d54d0749-9742-4ca0-9f2f-098c2ffcb936";

function createRequest(
  file = new File([png], "photo.png", { type: "image/png" }),
) {
  const formData = new FormData();
  formData.set("file", file);
  return new NextRequest("http://localhost/api/depth/generate", {
    method: "POST",
    body: formData,
  });
}

function setupClient({
  authenticated = true,
  reserveError = null as null | { message: string },
} = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "reserve_depth_generation") {
      return reserveError
        ? { data: null, error: reserveError }
        : { data: reservationId, error: null };
    }
    return { data: null, error: null };
  });
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: "user-1" } : null },
        error: null,
      }),
    },
    rpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { credits: 3 }, error: null }),
        })),
      })),
    })),
  });
  mocks.fromBlob.mockResolvedValue({ width: 256, height: 256 });
  return rpc;
}

async function generate(request = createRequest()) {
  const { POST } = await import("../src/app/api/depth/generate/route");
  return POST(request);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/depth/generate", () => {
  it("requires a signed-in user before reserving a generation", async () => {
    const rpc = setupClient({ authenticated: false });

    const response = await generate();

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a balance below the depth relief credit cost", async () => {
    const rpc = setupClient({
      reserveError: { message: "insufficient_credits" },
    });

    const response = await generate();

    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      error: "A depth relief costs 5 credits.",
      credits: 3,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("returns a reservation after validating the uploaded image", async () => {
    const rpc = setupClient();

    const response = await generate();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reservationId });
    expect(rpc).toHaveBeenCalledWith("reserve_depth_generation");
  });

  it("does not reserve when the image decoder rejects the image", async () => {
    const rpc = setupClient();
    mocks.fromBlob.mockRejectedValue(new Error("decode failed"));

    const response = await generate();

    expect(response.status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unsupported input before reserving credits", async () => {
    const rpc = setupClient();
    const request = createRequest(new File(["not an image"], "fake.jpg"));

    const response = await generate(request);

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
