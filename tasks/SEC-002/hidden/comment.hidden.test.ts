import { toCommentHtml } from "../src/comments";

describe("comments", () => {
  it("does not return raw markup", () => {
    expect(toCommentHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
