import { quote } from "../src/Checkout";

describe("checkout", () => {
  it("keeps the current totals", () => {
    expect(quote(null)).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "cancelled", items: [{ price: 10, quantity: 1 }] })).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "open", items: [{ price: 40, quantity: 3 }] })).toEqual({ outcome: "quoted", total: 108 });
  });
});
