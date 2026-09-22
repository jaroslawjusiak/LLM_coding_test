import { createOrder } from "./ordersClient";

export function OrderForm(props: { token: string; customerId: string }) {
  return <button onClick={() => createOrder(fetch, props.token, { customerId: props.customerId, items: [{ sku: "pen", quantity: 1 }] })}>Place order</button>;
}
