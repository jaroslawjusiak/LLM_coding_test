export interface Order { userId: number; status: string }

export function groupActive(users: { id: number }[], orders: Order[]): Order[][] {
  const byUser = new Map<number, Order[]>();
  for (const order of orders) {
    if (order.status !== "active") continue;
    const list = byUser.get(order.userId) ?? [];
    list.push(order);
    byUser.set(order.userId, list);
  }
  return users.map((user) => byUser.get(user.id) ?? []);
}

export async function loadOrders(fetchImpl: (url: string) => Promise<{ json(): Promise<Order[]> }>, userIds: number[]): Promise<Order[][]> {
  const response = await fetchImpl(`/api/orders?userIds=${userIds.join(",")}`);
  const body = await response.json();
  return userIds.map((id) => body.filter((order) => order.userId === id));
}
