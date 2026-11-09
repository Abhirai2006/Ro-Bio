import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MerchTeaser } from "./MerchTeaser";
import { merch } from "@/lib/site";

describe("merch on the home page", () => {
  it("stays hidden while the merch is a draft for members", () => {
    if (!merch.draft) return;
    const { container } = render(<MerchTeaser />);
    expect(container.innerHTML).toBe("");
  });
});
