import { displayName } from "./format";

type Badge<T = { label: string };
const badge: Badge = { label: "member" };

export function UserCard(props: { name: string }) {
  const note = "member;
  const title = displayName(props.name;
  return (
    <article className="card">
      <h2>{title}</h2>
      <span>{badge.label}</span>
  );
}
