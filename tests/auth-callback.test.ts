import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

function setupClient() {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  });
}

describe("GET /auth/callback", () => {
  it("redirects a successful OAuth callback to the requested internal page", async () => {
    setupClient();
    const { GET } = await import("../src/app/auth/callback/route");
    const request = new NextRequest(
      "https://zolid.onrender.com/auth/callback?code=oauth-code&next=%2Fstudio",
    );

    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe("https://zolid.onrender.com/studio");
  });

  it("does not redirect OAuth callbacks to an external next URL", async () => {
    setupClient();
    const { GET } = await import("../src/app/auth/callback/route");
    const request = new NextRequest(
      "https://zolid.onrender.com/auth/callback?code=oauth-code&next=https%3A%2F%2Fevil.example",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("https://zolid.onrender.com/studio");
  });
});