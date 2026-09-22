export interface Order { userId: number; status: string }

export function groupActive(users: { id: number }[], orders: Order[]): Order[][] {
  return users.map((user) => orders.filter((order) => order.userId === user.id && order.status === "active"));
}

export async function loadOrders(fetchImpl: (url: string) => Promise<{ json(): Promise<Order[]> }>, userIds: number[]): Promise<Order[][]> {
  const results = [];
  for (const id of userIds) {
    const response = await fetchImpl(`/api/orders?userId=${id}`);
    results.push(await response.json());
  }
  return results;
}
