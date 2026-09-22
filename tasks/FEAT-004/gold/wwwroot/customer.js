export function parseCustomerId(value) {
  if (!/^[0-9a-fA-F-]{36}$/.test(String(value))) throw new Error("customer id must be a guid");
  return String(value);
}
