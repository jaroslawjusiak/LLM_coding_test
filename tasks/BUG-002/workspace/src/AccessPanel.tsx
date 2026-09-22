import { canSeeAdminPanel } from "./access";

export function AccessPanel(props: { role: string }) {
  if (!canSeeAdminPanel(props.role)) return <p>Restricted</p>;
  return <p>Admin tools</p>;
}
