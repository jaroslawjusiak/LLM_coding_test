import { activeLabels } from "./format";
import { UserCard } from "./UserCard";

export function labels(names: string[]): string[] {
  const cleaned = activeLabels(names);
  return cleaned.map((name) => name.trim());
}

export function UserList(props: { names: string[] }) {
  return (
    <ul>
      {labels(props.names).map((name) => (
        <li key={name}>
          <UserCard name={name} />
        </li>
      ))}
    </ul>
  );
}
