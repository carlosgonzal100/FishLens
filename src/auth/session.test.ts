import { describe, it, expect, beforeEach } from "vitest";
import { isSignedIn, startSession, endSession } from "./session";

beforeEach(() => {
  localStorage.clear(); // each test starts with no one signed in
});

describe("session (User Stories 1.1 and 1.4)", () => {
  // 1.1: a user who is not signed in is not treated as signed in
  it("a new visitor is not signed in", () => {
    expect(isSignedIn()).toBe(false);
  });

  // 1.1: after signing in, the user stays signed in
  it("startSession signs the user in", () => {
    startSession();
    expect(isSignedIn()).toBe(true);
  });

  // 1.4: signing out ends the session
  it("endSession signs the user out", () => {
    startSession();
    endSession();
    expect(isSignedIn()).toBe(false);
  });
});
