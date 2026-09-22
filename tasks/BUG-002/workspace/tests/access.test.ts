import { canSeeAdminPanel, formatDelivery } from "../src/access";

describe("access", () => {
  it("does not treat every role as admin", () => {
    expect(canSeeAdminPanel("User")).toBe(false);
    expect(canSeeAdminPanel("Admin")).toBe(true);
    expect(canSeeAdminPanel("SuperAdmin")).toBe(true);
  });

  it("formats delivery in UTC", () => {
    expect(formatDelivery("2024-05-06T08:30:00Z")).toBe("08:30 UTC");
  });
});
