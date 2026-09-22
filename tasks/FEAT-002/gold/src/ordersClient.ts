export interface OrderItem { sku: string; quantity: number }
export interface OrderRequest { customerId: string; items: OrderItem[] }

export async function createOrder(fetchImpl: (url: string, init: RequestInit) => Promise<Response>, token: string, request: OrderRequest) {
  const response = await fetchImpl("/api/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: request.customerId, items: request.items }),
  });
  if (!response.ok) throw new Error("order failed");
  return response.json();
}
