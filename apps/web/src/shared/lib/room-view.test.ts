import { describe, expect, it } from "vitest";

import { clearStoredSession, getStoredSession, storeSession } from "./session";

describe("room session storage", () => {
  it("stores by uppercased room code", () => {
    storeSession("ab12", "session-1");

    expect(getStoredSession("AB12")).toBe("session-1");

    clearStoredSession("ab12");
    expect(getStoredSession("AB12")).toBeNull();
  });
});
