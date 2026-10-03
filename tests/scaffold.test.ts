import { describe, expect, it } from "vitest";
import { metadata } from "../src/app/layout";

describe("application scaffold", () => {
  it("declares the Zolid app metadata", () => {
    expect(metadata.title).toBe("Zolid | Image to 3D");
  });
});
