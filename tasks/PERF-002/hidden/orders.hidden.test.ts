import { groupActive, loadOrders } from "../src/orders";

describe("performance", () => {
  it("does not filter once per user", () => {
    let reads = 0;
    const orders = Array.from({ length: 2000 }, (_, index) => ({
      get userId() { reads += 1; return index % 50; },
      status: "active",
    }));
    groupActive(Array.from({ length: 50 }, (_, id) => ({ id })), orders);
    expect(reads).toBeLessThan(orders.length * 5);
  });

  it("does not fetch once per user", async () => {
    let calls = 0;
    const fetchImpl = async (url: string) => {
      calls += 1;
      const ids = new URL(url, "http://local").searchParams.get("userIds")?.split(",") ?? [new URL(url, "http://local").searchParams.get("userId")];
      return new Response(JSON.stringify(ids.map((id) => ({ userId: Number(id), status: "active" }))), { status: 200 });
    };
    const loaded = await loadOrders(fetchImpl, Array.from({ length: 30 }, (_, id) => id + 1));
    expect(calls).toBeLessThanOrEqual(2);
    expect(loaded.flat()).toHaveLength(30);
  });
});
