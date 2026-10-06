import { describe, expect, it } from "vitest";
import { getSafeAuthRedirect } from "../src/lib/auth/redirect";
import { loginSchema, signupSchema } from "../src/lib/validation/auth";

describe("authentication validation", () => {
  it("accepts valid login credentials without trimming the password", () => {
    expect(
      loginSchema.safeParse({ email: "user@example.com", password: " pass word " })
        .success,
    ).toBe(true);
  });

  it("rejects malformed email and missing login password", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "" }).success).toBe(
      false,
    );
  });

  it("requires a minimum-length password for signup", () => {
    expect(
      signupSchema.safeParse({ email: "user@example.com", password: "short" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ email: "user@example.com", password: "long enough" })
        .success,
    ).toBe(true);
  });

  it("allows only safe internal post-auth redirects", () => {
    expect(getSafeAuthRedirect("/gallery?filter=recent")).toBe(
      "/gallery?filter=recent",
    );
    expect(getSafeAuthRedirect("https://example.com")).toBe("/studio");
    expect(getSafeAuthRedirect("//example.com")).toBe("/studio");
    expect(getSafeAuthRedirect("/auth/login")).toBe("/studio");
  });
});