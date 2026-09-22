import { quote } from "../src/Checkout";

describe("checkout edges", () => {
  it("locks boundaries", () => {
    expect(quote({ status: "open", items: [] })).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "open", items: [{ price: 20, quantity: 0 }] })).toEqual({ outcome: "quoted", total: 0 });
    expect(quote({ status: "open", items: [{ price: 99, quantity: 1 }] }).total).toBe(99);
  });
});
