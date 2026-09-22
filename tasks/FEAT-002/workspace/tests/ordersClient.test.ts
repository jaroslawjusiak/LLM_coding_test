import { createOrder } from "../src/ordersClient";

describe("orders client", () => {
  it("matches the OpenAPI contract", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ orderId: "o-1", status: "accepted" }), { status: 201 });
    };
    const result = await createOrder(fetchImpl, "secret-token", {
      customerId: "c-9",
      items: [{ sku: "pen", quantity: 2 }],
    });
    expect(result).toEqual({ orderId: "o-1", status: "accepted" });
    expect(calls[0].url).toBe("/api/orders");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      customerId: "c-9",
      items: [{ sku: "pen", quantity: 2 }],
    });
  });
});
