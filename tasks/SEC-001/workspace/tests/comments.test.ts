import { toCommentHtml } from "../src/comments";

describe("comments", () => {
  it("returns text for a normal comment", () => {
    expect(toCommentHtml("thanks")).toContain("thanks");
  });
});
