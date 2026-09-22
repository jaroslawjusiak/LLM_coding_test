import { groupActive } from "./orders";

export function OrderTable(props: { users: { id: number }[]; orders: { userId: number; status: string }[] }) {
  const groups = groupActive(props.users, props.orders);
  return <p>{groups.length}</p>;
}
