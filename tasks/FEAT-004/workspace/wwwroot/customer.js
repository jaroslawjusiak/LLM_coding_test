export function parseCustomerId(value) {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new Error("customer id must be an integer");
  return id;
}
