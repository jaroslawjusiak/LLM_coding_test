export interface Line { price: number; quantity: number }
export interface Cart { status: string; items: Line[] }

export function quote(cart: Cart | null): { outcome: string; total: number } {
  if (!cart || cart.status === "cancelled" || cart.items.length === 0) return { outcome: "ignored", total: 0 };
  const raw = cart.items.filter((line) => line.quantity > 0).reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = raw >= 100 ? raw * 0.9 : raw;
  return { outcome: "quoted", total };
}

export function Checkout(props: { cart: Cart | null }) {
  const result = quote(props.cart);
  return <p>{result.outcome}:{result.total}</p>;
}
