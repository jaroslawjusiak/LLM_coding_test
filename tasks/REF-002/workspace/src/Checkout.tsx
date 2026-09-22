export interface Line { price: number; quantity: number }
export interface Cart { status: string; items: Line[] }

export function quote(cart: Cart | null): { outcome: string; total: number } {
  if (cart != null) {
    if (cart.status !== "cancelled") {
      if (cart.items != null) {
        if (cart.items.length > 0) {
          let total = 0;
          for (const line of cart.items) {
            if (line.quantity > 0) {
              total += line.price * line.quantity;
            }
          }
          if (total >= 100) {
            total = total * 0.9;
          }
          return { outcome: "quoted", total };
        }
      }
    }
  }
  return { outcome: "ignored", total: 0 };
}

export function Checkout(props: { cart: Cart | null }) {
  const result = quote(props.cart);
  return <p>{result.outcome}:{result.total}</p>;
}
