// All FishLens tests are in this file.
//
// Integration tests: one test per acceptance criterion (AC) in spec.md. Each test opens
// the real App and uses it the way a user would, with the real account and session code. Only
// the backend is fake (see fakeBackend). backend/accounts/tests.py tests the real backend.
// Unit tests: each test calls a single function directly, without displaying any screens.
//
// The project is still changing, so the integration tests look for the meaning of the text on
// screen rather than its exact wording, and all of that text is listed in UI below. If a
// test fails only because of a wording change, update UI. The exception is
// "Incorrect username or password", which spec.md requires word for word.
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { endSession, isSignedIn, startSession } from "./auth/session";

// Typing into many fields takes longer than the default 5 second limit.
vi.setConfig({ testTimeout: 30000 });

const VALID_ACCOUNT = {
  firstName: "Alex",
  lastName: "Rivera",
  email: "angler@example.com",
  username: "fishfan2024",
  password: "Fish!2024",
};

type RegistrationValues = typeof VALID_ACCOUNT;

const FIELD_LABELS: Record<keyof RegistrationValues, RegExp> = {
  firstName: /first name/i,
  lastName: /last name/i,
  email: /email/i,
  username: /username/i,
  password: /password/i,
};

// What the tests look for on screen. This is the one place to update if wording changes.
const UI = {
  signIn: /sign in/i,
  register: /register/i,
  profile: /profile/i,
  signOut: /sign out|log out/i,
  accountCreated: /created/i,
  allFieldsRequired: /required/i,
  firstNameRule: /first name.*\b3\b.*\b20\b/i,
  lastNameRule: /last name.*\b3\b.*\b20\b/i,
  emailRule: /email.*valid|valid.*email/i,
  usernameRule: /username.*\b8\b.*\b16\b/i,
  passwordRule: /password.*\b8\b/i,
  alreadyInUse: /already in use/i,
  incorrectSignIn: "Incorrect username or password", // exact wording required by spec.md
};

// Requirement messages are paragraphs. Looking only at paragraphs stops a test from
// matching a form label that has the same words, like "First name".
const MESSAGE = { selector: "p" };

let user: UserEvent;

// The accounts the fake backend has saved, like the accounts collection in the database.
let serverAccounts: RegistrationValues[] = [];

// Stands in for the Django backend, so these tests run without a server or a database.
async function fakeBackend(url: string, options: RequestInit) {
  const values = JSON.parse(String(options.body));
  const reply = (status: number, body: unknown) => ({ status, json: async () => body });

  if (url.endsWith("/register/")) {
    const account = {
      ...values,
      email: values.email.toLowerCase(),
      username: values.username.toLowerCase(),
    };
    const inUse = serverAccounts.some(
      (saved) => saved.email === account.email || saved.username === account.username,
    );
    if (inUse) {
      return reply(409, { errors: { form: "Username or email is already in use." } });
    }
    serverAccounts.push(account);
    return reply(201, { account });
  }

  const matches = serverAccounts.some(
    (saved) => saved.username === values.username && saved.password === values.password,
  );
  return matches
    ? reply(200, { token: "fake-token" })
    : reply(401, { errors: { form: "Incorrect username or password" } });
}

beforeEach(() => {
  localStorage.clear(); // each test starts with no one signed in
  serverAccounts = []; // and no accounts
  vi.stubGlobal("fetch", fakeBackend);
  user = userEvent.setup();
});

afterEach(() => {
  cleanup();
});

// Opens the app and skips the 1.8 second splash screen.
function openApp() {
  vi.useFakeTimers();
  const app = render(<App />);
  act(() => {
    vi.advanceTimersByTime(1800);
  });
  vi.useRealTimers();
  return app;
}

// Finds the dashboard by its profile menu, which the profile screen doesn't have.
function dashboardIsShowing() {
  return document.querySelector(".profile-menu") !== null;
}

async function waitForDashboard() {
  await waitFor(() => expect(dashboardIsShowing()).toBe(true));
}

// Replaces whatever is in the register form with these values and submits it.
async function submitRegistration(values: RegistrationValues) {
  for (const field of Object.keys(FIELD_LABELS) as (keyof RegistrationValues)[]) {
    const input = screen.getByLabelText(FIELD_LABELS[field]);
    await user.clear(input);
    if (values[field]) {
      await user.type(input, values[field]);
    }
  }
  await user.click(screen.getByRole("button", { name: UI.register }));
}

async function openRegisterScreen() {
  openApp();
  await user.click(screen.getByRole("button", { name: UI.register }));
}

// Registers an account through the real form, then closes the app.
async function registerAccount(values: RegistrationValues = VALID_ACCOUNT) {
  const app = openApp();
  await user.click(screen.getByRole("button", { name: UI.register }));
  await submitRegistration(values);
  await screen.findByText(UI.accountCreated);
  app.unmount();
}

async function submitSignIn(username: string, password: string) {
  const usernameInput = screen.getByLabelText(FIELD_LABELS.username);
  const passwordInput = screen.getByLabelText(FIELD_LABELS.password);
  await user.clear(usernameInput);
  await user.type(usernameInput, username);
  await user.clear(passwordInput);
  await user.type(passwordInput, password);
  await user.click(screen.getByRole("button", { name: UI.signIn }));
}

// Registers an account, signs in with it, and waits for the dashboard.
async function signInThroughApp() {
  await registerAccount();
  const app = openApp();
  await user.click(screen.getByRole("button", { name: UI.signIn }));
  await submitSignIn(VALID_ACCOUNT.username, VALID_ACCOUNT.password);
  await waitForDashboard();
  return app;
}

async function signOut() {
  await user.click(screen.getByRole("button", { name: UI.profile }));
  await user.click(screen.getByRole("menuitem", { name: UI.signOut }));
}

describe("UNIT TESTS: session functions", () => {
  // Kept: when i open the app, and am not signed in, i see the sign-in screen
  // Supports User Story 1.1 AC1 and AC2
  it("a new visitor is not signed in", () => {
    expect(isSignedIn()).toBe(false);
  });

  // KEPT: when i sign in, and then close the app, and then reopen the app, i am still signed in
  // and taken to the home screen. same when i enter the correct username and password.
  // Supports User Story 1.1 AC3 and User Story 1.3 AC1
  it("startSession signs the user in", () => {
    startSession();
    expect(isSignedIn()).toBe(true);
  });

  // KEPT: when i sign out, and then close the app, and then reopen the app,
  // i expect not to be signed in
  // Supports User Story 1.4 AC1
  it("endSession signs the user out", () => {
    startSession();
    endSession();
    expect(isSignedIn()).toBe(false);
  });
});

describe("INTEGRATION TESTS: User Story 1.1 - Access the Starter Screen", () => {

  // KEPT: when i open the app, and am not signed in, i see the sign-in screen
  // with the option to register or sign in. This checks if those buttons are
  // there when i open the app.
  // Supports User Story 1.1 AC1
  it("AC1: a signed-out user is offered Sign In and Register when the app opens", () => {
    openApp();

    expect(screen.getByRole("button", { name: UI.signIn })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: UI.register })).toBeInTheDocument();
  });

  //KEPT: when i open the app and am not signed in, i dont see the homepage and cant access
  //other features of the app until i sign in. It tests the app like a user by going to the
  //sign in page and putting in a valid username, but a invalid password and expects the
  //dashboard to no be showing. Then it tests the app again by putting in a valid username and password
  //and expects the dashboard to be showing.
  //Supports User Story 1.1 AC2
  it("AC2: a signed-out user cannot reach the app's features until signing in", async () => {
    await registerAccount();
    openApp();

    expect(dashboardIsShowing()).toBe(false);
    expect(screen.queryByRole("button", { name: UI.profile })).not.toBeInTheDocument();

    // A failed sign-in still does not get them in.
    await user.click(screen.getByRole("button", { name: UI.signIn }));
    await submitSignIn(VALID_ACCOUNT.username, "Wrong!2024");
    await screen.findByRole("alert");
    expect(dashboardIsShowing()).toBe(false);

    // A successful sign-in does.
    await submitSignIn(VALID_ACCOUNT.username, VALID_ACCOUNT.password);
    await waitForDashboard();
  });

  //KEPT: when the user is signed in, closes the app, and reopens the app, they are still signed in
  //and taken to the home screen. This is tested by checking for the regrister button because when the
  //user isnt signed in and reopens the app, they should see the register button.
  //Supports User Story 1.1 AC3
  it("AC3: a user who did not log out goes straight to the dashboard on reopening", async () => {
    const app = await signInThroughApp();
    app.unmount();

    openApp();

    expect(dashboardIsShowing()).toBe(true);
    expect(screen.queryByRole("button", { name: UI.register })).not.toBeInTheDocument();
  });
});

describe("INTEGRATION TESTS: User Story 1.2 - Register an Account", () => {

  //KEPT: this test opens the register screen and fills in all the fields with valid information and submits it.
  //It then checks for the success message and checks if the account was saved by the fake backend
  //Supports User Story 1.2 AC1
  it("AC1: valid, unused details create the account", async () => {
    await openRegisterScreen();

    await submitRegistration(VALID_ACCOUNT);

    expect(await screen.findByRole("status")).toHaveTextContent(UI.accountCreated);
    expect(serverAccounts).toHaveLength(1);
    expect(serverAccounts[0]).toMatchObject({
      firstName: VALID_ACCOUNT.firstName,
      lastName: VALID_ACCOUNT.lastName,
      email: VALID_ACCOUNT.email,
      username: VALID_ACCOUNT.username,
    });
  });

  //KEPT: opens the register screen and fills all fields except one field and submits it. it
  //then expects a message showing all fields are required and no account to be saved.
  //Supports User Story 1.2 AC2
  it("AC2: a missing field shows that all fields are required and creates no account", async () => {
    await openRegisterScreen();

    for (const field of Object.keys(FIELD_LABELS) as (keyof RegistrationValues)[]) {
      await submitRegistration({ ...VALID_ACCOUNT, [field]: "" });

      expect(await screen.findByRole("alert")).toHaveTextContent(UI.allFieldsRequired);
      expect(serverAccounts).toHaveLength(0);
    }
  });

  //KEPT:opens the register screen, fills the account with invalid first and last names and submits it
  //it then expects a message showing the name requirements and no account to be saved.
  //Supports User Story 1.2 AC3
  it("AC3: an invalid first or last name shows the name requirement and creates no account", async () => {
    await openRegisterScreen();
    const invalidNames = ["Al", "A".repeat(21), "Carl0s", "Car!os"];

    for (const name of invalidNames) {
      await submitRegistration({ ...VALID_ACCOUNT, firstName: name });
      expect(await screen.findByText(UI.firstNameRule, MESSAGE)).toBeInTheDocument();

      await submitRegistration({ ...VALID_ACCOUNT, lastName: name });
      expect(await screen.findByText(UI.lastNameRule, MESSAGE)).toBeInTheDocument();

      expect(serverAccounts).toHaveLength(0);
    }

    // The limits themselves (3 and 20 letters) are allowed.
    await submitRegistration({ ...VALID_ACCOUNT, firstName: "Abe", lastName: "A".repeat(20) });
    expect(await screen.findByRole("status")).toHaveTextContent(UI.accountCreated);
  });

  //KEPT: an invalid email shows that the format must be valid and creates no account
  //and expects a message showing the email format requirements and no account to be saved.
  //Supports User Story 1.2 AC4
  it("AC4: an invalid email shows that the format must be valid and creates no account", async () => {
    await openRegisterScreen();

    for (const email of ["angler", "angler@", "angler@example", "@example.com"]) {
      await submitRegistration({ ...VALID_ACCOUNT, email });

      expect(await screen.findByText(UI.emailRule, MESSAGE)).toBeInTheDocument();
      expect(serverAccounts).toHaveLength(0);
    }
  });

  //KEPT: a username outside 8-16 characters shows the length requirement which is a length
  //of 8 to 16 characters and creates no account. it expects to find a message that mentions
  //the username and the 8 and 16 limits, and no account to be saved.
  // it also tests the proper limits of 8 to 16 letter usernames.
  //Supports User Story 1.2 AC5
  it("AC5: a username outside 8-16 characters shows the length requirement and creates no account", async () => {
    await openRegisterScreen();

    for (const username of ["a".repeat(7), "a".repeat(17)]) {
      await submitRegistration({ ...VALID_ACCOUNT, username });

      expect(await screen.findByText(UI.usernameRule, MESSAGE)).toBeInTheDocument();
      expect(serverAccounts).toHaveLength(0);
    }

    // The limits themselves (8 and 16 characters) are allowed.
    await submitRegistration({ ...VALID_ACCOUNT, username: "a".repeat(8) });
    expect(await screen.findByRole("status")).toHaveTextContent(UI.accountCreated);
    await submitRegistration({
      ...VALID_ACCOUNT,
      email: "second@example.com",
      username: "b".repeat(16),
    });
    expect(await screen.findByRole("status")).toHaveTextContent(UI.accountCreated);
    expect(serverAccounts).toHaveLength(2);
  });

  //KEPT: tests 4 invalid passwords by opening and submitting them in the register screen and
  //expects a message showing the password requirements and no account to be saved.
  //it also tests the proper limit of 8 characters for a password with a letter, special char,
  //a number and must be 8 chars or more.
  //Supports User Story 1.2 AC6
  it("AC6: an invalid password shows the password requirements and creates no account", async () => {
    await openRegisterScreen();
    const invalidPasswords = [
      "Fish!12", // only 7 characters
      "12345!678", // no letter
      "Fishing!!", // no number
      "Fishing12", // no special character
    ];

    for (const password of invalidPasswords) {
      await submitRegistration({ ...VALID_ACCOUNT, password });

      expect(await screen.findByText(UI.passwordRule, MESSAGE)).toBeInTheDocument();
      expect(serverAccounts).toHaveLength(0);
    }

    // The limit itself (exactly 8 characters) is allowed.
    await submitRegistration({ ...VALID_ACCOUNT, password: "Fish!123" });
    expect(await screen.findByRole("status")).toHaveTextContent(UI.accountCreated);
  });

  //KEPT: tests if a username or email already in use is rejected and creates no account. it does this by
  //creating an account that isnt in use already, meaning their passwords and emails arent already in use.
  //then it creates a second and third account with the same username and email, but alternating with different
  //emails and usernames and expects a message saying it is "already in use" and only 1 account to be saved.
  //Supports User Story 1.2 AC7
  it("AC7: a username or email already in use is rejected and creates no account", async () => {
    await registerAccount();
    await openRegisterScreen();

    // Same username, different email. Capital letters must not get around the check.
    await submitRegistration({
      ...VALID_ACCOUNT,
      email: "other@example.com",
      username: VALID_ACCOUNT.username.toUpperCase(),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(UI.alreadyInUse);
    expect(screen.queryByText(UI.accountCreated)).not.toBeInTheDocument();
    expect(serverAccounts).toHaveLength(1);

    // Same email, different username.
    await submitRegistration({
      ...VALID_ACCOUNT,
      email: VALID_ACCOUNT.email.toUpperCase(),
      username: "otherangler",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(UI.alreadyInUse);
    expect(screen.queryByText(UI.accountCreated)).not.toBeInTheDocument();
    expect(serverAccounts).toHaveLength(1);
  });
});

describe("INTEGRATION TESTS: User Story 1.3 - Sign In", () => {

  //KEPT: opens the app, signs in with a valid username and password that is registered
  //and expects the dashboard to be showing
  it("AC1: the correct username and password sign the user in and open the dashboard", async () => {
    await registerAccount();
    openApp();
    await user.click(screen.getByRole("button", { name: UI.signIn }));

    await submitSignIn(VALID_ACCOUNT.username, VALID_ACCOUNT.password);

    await waitForDashboard();
    expect(isSignedIn()).toBe(true);
  });

  //KEPT: opens the app and signs in with a valid username and invalid password. then tries to sign
  //in with an invalid username and valid password. both expects messages that say "Incorrect username 
  //or password" and expects the dashboard to not be showing. it then signs in with the correct username 
  //and password and expects the dashboard to be showing.
  //Supports User Story 1.3 AC2
  it("AC2: a wrong username or password shows the exact message and lets the user retry", async () => {
    await registerAccount();
    openApp();
    await user.click(screen.getByRole("button", { name: UI.signIn }));

    // Wrong password
    await submitSignIn(VALID_ACCOUNT.username, "Wrong!2024");
    expect(await screen.findByRole("alert")).toHaveTextContent(UI.incorrectSignIn);
    expect(isSignedIn()).toBe(false);
    expect(dashboardIsShowing()).toBe(false);

    // Wrong username
    await submitSignIn("notauser2024", VALID_ACCOUNT.password);
    expect(await screen.findByRole("alert")).toHaveTextContent(UI.incorrectSignIn);
    expect(isSignedIn()).toBe(false);
    expect(dashboardIsShowing()).toBe(false);

    // Trying again with the correct details works.
    await submitSignIn(VALID_ACCOUNT.username, VALID_ACCOUNT.password);
    await waitForDashboard();
    expect(isSignedIn()).toBe(true);
  });
});

describe("INTEGRATION TESTS: User Story 1.4 - Sign Out", () => {

  //KEPT: the test sings the user in, signs them out, then expexts isSingedIn to be false,
  //and the dashboard to not be showing. it also expects the sign in screen to be showing.
  //Supports User Story 1.4 AC1
  it("AC1: logging out signs the user out and returns them to the sign-in screen", async () => {
    await signInThroughApp();

    await signOut();

    expect(screen.getByRole("heading", { name: UI.signIn })).toBeInTheDocument();
    expect(isSignedIn()).toBe(false);
    expect(dashboardIsShowing()).toBe(false);
  });

  //KEPT: the test signs the user in, signs them out, closes the app, and reopens it. it expects the dashboard to not be showing
  //and the sign in screen to be showing. it then signs in again and expects the dashboard to be showing.
  //Supports User Story 1.4 AC2
  it("AC2: after logging out, the app's features are blocked until signing in again", async () => {
    const app = await signInThroughApp();
    await signOut();
    app.unmount();

    // Reopening the app does not bring back the dashboard.
    openApp();
    expect(dashboardIsShowing()).toBe(false);
    expect(screen.getByRole("button", { name: UI.signIn })).toBeInTheDocument();

    // Signing in again does.
    await user.click(screen.getByRole("button", { name: UI.signIn }));
    await submitSignIn(VALID_ACCOUNT.username, VALID_ACCOUNT.password);
    await waitForDashboard();
  });
});
