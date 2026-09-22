import { groupActive, loadOrders } from "../src/orders";

describe("orders", () => {
  it("groups active orders", () => {
    const grouped = groupActive([{ id: 1 }, { id: 2 }], [
      { userId: 1, status: "active" },
      { userId: 1, status: "closed" },
      { userId: 2, status: "active" },
    ]);
    expect(grouped.map((group) => group.length)).toEqual([1, 1]);
  });

  it("loads orders for the requested users", async () => {
    const fetchImpl = async (url: string) => new Response(JSON.stringify([{ userId: url, status: "active" }]), { status: 200 });
    const loaded = await loadOrders(fetchImpl, [1, 2]);
    expect(loaded).toHaveLength(2);
  });
});
