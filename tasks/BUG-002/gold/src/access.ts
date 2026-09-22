export function canSeeAdminPanel(role: string): boolean {
  return role === "Admin" || role === "SuperAdmin";
}

export function formatDelivery(iso: string): string {
  const date = new Date(iso);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} UTC`;
}
