import { displayName, activeLabels } from "../src/format";

describe("format", () => {
  it("keeps display text", () => {
    expect(displayName("Ada")).toBe("User: Ada");
    expect(activeLabels(["Ada", "Grace"])).toEqual(["Ada", "Grace"]);
  });
});
