import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

const reservationId = "d54d0749-9742-4ca0-9f2f-098c2ffcb936";

function setupClient(
  rpcResult: { data: unknown; error: unknown } = {
    data: [{ purchased_credits: 10 }],
    error: null,
  },
) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    rpc,
  });
  return rpc;
}

function createRequest(previewDataUrl = "data:image/jpeg;base64,AAAA") {
  return new NextRequest("http://localhost/api/depth/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId, previewDataUrl }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/depth/complete", () => {
  it("rejects an oversized preview before calling the debit RPC", async () => {
    const rpc = setupClient();
    const { POST } = await import("../src/app/api/depth/complete/route");
    const response = await POST(
      createRequest(`data:image/jpeg;base64,${"A".repeat(180_000)}`),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      code: "PREVIEW_TOO_LARGE",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns the authoritative balance after completion", async () => {
    const rpc = setupClient({
      data: [
        {
          free_generations_used: 0,
          free_generations_limit: 0,
          purchased_credits: 10,
        },
      ],
      error: null,
    });
    const { POST } = await import("../src/app/api/depth/complete/route");
    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ purchasedCredits: 10 });
    expect(rpc).toHaveBeenCalledWith("complete_depth_generation", {
      p_reservation_id: reservationId,
      p_preview_data_url: "data:image/jpeg;base64,AAAA",
    });
  });

  it("reports when the database refuses to complete a debit", async () => {
    const rpc = setupClient({
      data: null,
      error: { code: "XX000", message: "completion failed" },
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("../src/app/api/depth/complete/route");
    const response = await POST(createRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "CREDIT_COMPLETION_FAILED",
    });
    expect(errorLog).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledOnce();
  });
});