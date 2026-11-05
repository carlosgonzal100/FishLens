import { describe, it, expect, beforeEach } from "vitest";
import { addAccount } from "../auth/accounts";
import { startSession, endSession, getSignedInUsername } from "../auth/session";
import { getCurrentProfile, getInitials } from "./profile";
import { loadCatches, saveCatches, summarizeCatches, type Catch } from "../catches/catches";

beforeEach(() => {
  localStorage.clear(); // each test starts with no accounts and no one signed in
});

const alexander = {
  firstName: "Alexander",
  lastName: "Dana",
  email: "alex@example.com",
  username: "alexanderdana",
  passwordHash: "not-a-real-hash",
};

describe("profile (User Story 2.1)", () => {
  it("remembers who signed in", () => {
    startSession("alexanderdana");
    expect(getSignedInUsername()).toBe("alexanderdana");
  });

  it("forgets who signed in after signing out", () => {
    startSession("alexanderdana");
    endSession();
    expect(getSignedInUsername()).toBeNull();
  });

  // AC: the profile shows first name, last name, and username
  it("shows the signed-in user's name and username", () => {
    addAccount(alexander);
    startSession("alexanderdana");
    expect(getCurrentProfile()).toEqual({
      firstName: "Alexander",
      lastName: "Dana",
      username: "alexanderdana",
    });
  });

  it("never exposes the email or password hash", () => {
    addAccount(alexander);
    startSession("alexanderdana");
    const profile = getCurrentProfile();
    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("passwordHash");
  });

  it("returns no profile when nobody is signed in", () => {
    addAccount(alexander);
    expect(getCurrentProfile()).toBeNull();
  });

  it("makes initials for the profile picture placeholder", () => {
    expect(getInitials({ firstName: "Alexander", lastName: "Dana", username: "alexanderdana" })).toBe(
      "AD",
    );
  });
});

describe("fishing summary and catch history (User Story 2.1)", () => {
  const catches: Catch[] = [
    { id: "1", species: "Scup", weightLb: 1.1, location: "Jones Beach", caughtAt: "2026-08-03" },
    { id: "2", species: "Bluefish", weightLb: 1.8, location: "Robert Moses State Park", caughtAt: "2026-08-17" },
  ];

  // AC: the summary shows number of fish caught and biggest fish
  it("counts catches and finds the biggest fish", () => {
    const summary = summarizeCatches(catches);
    expect(summary.totalCaught).toBe(2);
    expect(summary.biggest?.species).toBe("Bluefish");
  });

  it("handles a user with no catches", () => {
    expect(summarizeCatches([])).toEqual({ totalCaught: 0, biggest: null });
  });

  // AC: the Catch History tab shows the user's own recorded catches
  it("only loads each user's own catches", () => {
    saveCatches("alexanderdana", catches);
    saveCatches("jordantaylor", [
      { id: "3", species: "Striped Bass", weightLb: 9, location: "Montauk", caughtAt: "2026-09-01" },
    ]);
    expect(loadCatches("alexanderdana")).toHaveLength(2);
    expect(loadCatches("jordantaylor")).toHaveLength(1);
  });
});
