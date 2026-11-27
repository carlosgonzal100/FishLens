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
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { endSession, isSignedIn, saveSessionToken, startSession } from "./auth/session";
import { validateName } from "./auth/validation";
import { MAX_UPLOAD_BYTES, checkImageFile } from "./profile/profilePicture";

// jsdom can't draw images, so shrinking a picture is faked. Everything else about
// uploading a picture is real.
vi.mock("./profile/profilePicture", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./profile/profilePicture")>()),
  resizeImage: async () => "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
}));
const RESIZED_PICTURE = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

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
  viewProfile: /view profile/i,
  editName: /edit name/i,
  save: /^save$/i,
  nameUpdated: /updated/i,
  openChat: /ai assistant/i,
  backToDashboard: /dashboard/i,
  question: /your question/i,
  send: /send/i,
  pictureUpdated: /picture updated/i,
  chooseFile: /choose a profile picture/i,
  cameraFile: /take a profile picture/i,
  pictureRule: /jpeg, png, or webp/i,
  openLibrary: /fish library/i,
  backToLibrary: /fish library/i,
  fishList: /fish species/i,
  searchFish: /search fish/i,
  noMatch: /no fish match/i,
};

// Requirement messages are paragraphs. Looking only at paragraphs stops a test from
// matching a form label that has the same words, like "First name".
const MESSAGE = { selector: "p" };

let user: UserEvent;

// The accounts the fake backend has saved, like the accounts collection in the database.
let serverAccounts: RegistrationValues[] = [];

// The questions the fake AI assistant received, and its answer to each one.
// Claude itself is never called: backend/chat/tests.py and the eval suite test that part.
let chatQuestions: string[] = [];
let chatAnswer = (question: string) => `Fake answer to: ${question}`;

// The species in the fake fish database (User Story 5.1). One has every detail
// and a picture; the other has only its name.
const STRIPED_BASS = {
  slug: "striped-bass",
  commonName: "Striped Bass",
  water: "saltwater",
  picture: "/fish/striped-bass.jpg",
  scientificName: "Morone saxatilis",
  features: "Silver sides with dark stripes.",
  habitat: "Bays, inlets, and the surf.",
  bestBait: "Bunker and clams.",
  morePictures: [],
};
const BLUEFISH = {
  slug: "bluefish",
  commonName: "Bluefish",
  water: "saltwater",
  picture: null,
  scientificName: "Pomatomus saltatrix",
  features: "",
  habitat: "",
  bestBait: "",
  morePictures: [],
};
const serverFish = [STRIPED_BASS, BLUEFISH];

// Stands in for the Django backend, so these tests run without a server or a database.
async function fakeBackend(url: string, options: RequestInit) {
  const reply = (status: number, body: unknown) => ({ status, json: async () => body });

  // User Story 5.1: only signed-in users can browse the fish database. Like the
  // real backend, the list is alphabetical.
  if (url.includes("/api/fish/")) {
    const header = (options.headers as Record<string, string>).Authorization;
    const account = serverAccounts.find((saved) => header === `Bearer fake-token-${saved.username}`);
    if (!account) return reply(401, { errors: { form: "Please sign in again." } });
    const slug = url.split("/api/fish/")[1].replace("/", "");
    if (!slug) {
      const sorted = [...serverFish].sort((a, b) => a.commonName.localeCompare(b.commonName));
      return reply(200, {
        fish: sorted.map(({ slug, commonName, water, picture }) => ({ slug, commonName, water, picture })),
      });
    }
    const fish = serverFish.find((saved) => saved.slug === slug);
    return fish ? reply(200, { fish }) : reply(404, { errors: { form: "That fish isn't in the database." } });
  }

  // User Story 6.2: only signed-in users can ask the assistant.
  if (url.endsWith("/api/chat/ask/")) {
    const header = (options.headers as Record<string, string>).Authorization;
    const account = serverAccounts.find((saved) => header === `Bearer fake-token-${saved.username}`);
    if (!account) return reply(401, { errors: { form: "Please sign in again." } });
    const { question } = JSON.parse(String(options.body));
    chatQuestions.push(question);
    return reply(200, { answer: chatAnswer(question), source: "llm:v2" });
  }

  if (url.endsWith("/me/")) {
    const header = (options.headers as Record<string, string>).Authorization;
    const account = serverAccounts.find((saved) => header === `Bearer fake-token-${saved.username}`);
    return account ? reply(200, { account }) : reply(401, { errors: { form: "Please sign in again." } });
  }

  // User Story 2.3: the token decides whose name changes.
  if (url.endsWith("/me/name/")) {
    const header = (options.headers as Record<string, string>).Authorization;
    const account = serverAccounts.find((saved) => header === `Bearer fake-token-${saved.username}`);
    if (!account) return reply(401, { errors: { form: "Please sign in again." } });
    const { firstName, lastName } = JSON.parse(String(options.body));
    account.firstName = firstName;
    account.lastName = lastName;
    return reply(200, { account });
  }

  // User Story 2.2: the token decides whose picture changes.
  if (url.endsWith("/me/picture/")) {
    const header = (options.headers as Record<string, string>).Authorization;
    const account = serverAccounts.find((saved) => header === `Bearer fake-token-${saved.username}`);
    if (!account) return reply(401, { errors: { form: "Please sign in again." } });
    Object.assign(account, { profilePicture: JSON.parse(String(options.body)).picture });
    return reply(200, { account });
  }

  const values = JSON.parse(String(options.body));

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
    ? reply(200, { token: `fake-token-${values.username}` })
    : reply(401, { errors: { form: "Incorrect username or password" } });
}

beforeEach(() => {
  localStorage.clear(); // each test starts with no one signed in
  serverAccounts = []; // and no accounts
  chatQuestions = [];
  chatAnswer = (question) => `Fake answer to: ${question}`;
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
  //and expects the dashboard to be showing. Last, it reopens the app with a saved token the
  //backend rejects and expects the user to be signed out.
  //Supports User Story 1.1 AC2
  it("AC2: a signed-out user cannot reach the app's features until signing in", async () => {
    await registerAccount();
    const app = openApp();

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

    // A saved token the backend rejects doesn't count as signed in.
    app.unmount();
    saveSessionToken("not-a-real-token");
    openApp();
    await screen.findByRole("button", { name: UI.signIn });
    expect(isSignedIn()).toBe(false);
    expect(dashboardIsShowing()).toBe(false);
  });

  //KEPT: when the user is signed in, closes the app, and reopens the app, they are still signed in
  //and taken to the home screen. This is tested by checking for the regrister button because when the
  //user isnt signed in and reopens the app, they should see the register button.
  //Supports User Story 1.1 AC3
  it("AC3: a user who did not log out goes straight to the dashboard on reopening", async () => {
    const app = await signInThroughApp();
    app.unmount();

    openApp();

    await waitForDashboard(); // after the backend accepts the saved token
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

// Opens the profile from the dashboard's profile menu.
async function openProfile() {
  await user.click(screen.getByRole("button", { name: UI.profile }));
  await user.click(screen.getByRole("menuitem", { name: UI.viewProfile }));
  await screen.findByRole("button", { name: UI.editName });
}

// Replaces the names in the edit form and saves.
async function saveName(firstName: string, lastName: string) {
  for (const [field, value] of [
    [FIELD_LABELS.firstName, firstName],
    [FIELD_LABELS.lastName, lastName],
  ] as const) {
    const input = screen.getByLabelText(field);
    await user.clear(input);
    if (value) await user.type(input, value);
  }
  await user.click(screen.getByRole("button", { name: UI.save }));
}

describe("UNIT TESTS: name rule (User Stories 1.2 and 2.3)", () => {
  //Supports User Story 2.3 AC1: names of 3 to 20 letters, from any language, are allowed
  it("accepts names of 3 to 20 letters, including accented letters", () => {
    for (const name of ["Ann", "Alexander", "José", "A".repeat(20)]) {
      expect(validateName(name, "First name")).toBeNull();
    }
  });

  //Supports User Story 2.3 AC2: anything else breaks the rule, and the message says which name
  it("rejects names that are too short, too long, or have numbers, symbols, or spaces", () => {
    for (const name of ["", "Al", "A".repeat(21), "Carl0s", "Car!os", "Mary Ann"]) {
      expect(validateName(name, "Last name")).toBe("Last name must contain 3 to 20 letters only.");
    }
  });
});

describe("INTEGRATION TESTS: User Story 2.3 - Edit Profile Information", () => {
  //Signs in, opens the profile, saves a new valid name, and expects the new name on the
  //profile and in the (fake) database.
  //Supports User Story 2.3 AC1
  it("AC1: a valid first and last name can be saved", async () => {
    await signInThroughApp();
    await openProfile();
    await user.click(screen.getByRole("button", { name: UI.editName }));

    await saveName("Alexander", "Dana");

    expect(await screen.findByRole("heading", { name: /alexander dana/i })).toBeInTheDocument();
    expect(screen.getByText(UI.nameUpdated, MESSAGE)).toBeInTheDocument();
    expect(serverAccounts[0]).toMatchObject({ firstName: "Alexander", lastName: "Dana" });
  });

  //Signs in, opens the profile, and tries invalid first and last names. Expects the name
  //requirement to show and nothing to be saved.
  //Supports User Story 2.3 AC2
  it("AC2: an invalid name is not saved and the name requirement is shown", async () => {
    await signInThroughApp();
    await openProfile();
    await user.click(screen.getByRole("button", { name: UI.editName }));

    for (const badName of ["Al", "Carl0s", "Car!os"]) {
      await saveName(badName, "Rivera");
      expect(screen.getByText(UI.firstNameRule, MESSAGE)).toBeInTheDocument();

      await saveName("Alex", badName);
      expect(screen.getByText(UI.lastNameRule, MESSAGE)).toBeInTheDocument();
    }

    expect(screen.getByRole("heading", { name: /alex rivera/i })).toBeInTheDocument();
    expect(serverAccounts[0]).toMatchObject({ firstName: "Alex", lastName: "Rivera" });
  });
});

// Opens the chat from the dashboard's chat button.
async function openChat() {
  await user.click(screen.getByRole("button", { name: UI.openChat }));
  await screen.findByLabelText(UI.question);
}

// Types a question in the chat and sends it.
async function ask(question: string) {
  await user.type(screen.getByLabelText(UI.question), question);
  await user.click(screen.getByRole("button", { name: UI.send }));
}

describe("INTEGRATION TESTS: User Story 6.2 - Ask the AI Assistant About Fish", () => {
  //Signs in, opens the chat from the dashboard, and asks about a species. Expects the
  //question to reach the backend and the assistant's answer to be shown.
  //Supports User Story 6.2 AC1
  it("AC1: a question about a fish species gets a response", async () => {
    await signInThroughApp();
    await openChat();
    chatAnswer = () => "Striped bass have dark stripes along their silver sides.";

    await ask("What does a striped bass look like?");

    expect(await screen.findByText(/dark stripes along their silver sides/i)).toBeInTheDocument();
    expect(screen.getByText("What does a striped bass look like?")).toBeInTheDocument();
    expect(chatQuestions).toEqual(["What does a striped bass look like?"]);
  });

  //Asks where a fish can be caught. Expects the location answer to be shown.
  //Supports User Story 6.2 AC2
  it("AC2: a where-to-catch question gets location information", async () => {
    await signInThroughApp();
    await openChat();
    chatAnswer = () => "Fluke are caught in the South Shore bays and inlets.";

    await ask("Where can I catch fluke on Long Island?");

    expect(await screen.findByText(/south shore bays and inlets/i)).toBeInTheDocument();
    expect(chatQuestions).toEqual(["Where can I catch fluke on Long Island?"]);
  });

  //Asks what bait to use. Expects the bait answer to be shown.
  //Supports User Story 6.2 AC3
  it("AC3: a bait question gets bait information", async () => {
    await signInThroughApp();
    await openChat();
    chatAnswer = () => "Porgy bite well on clams and squid.";

    await ask("What bait should I use for porgy?");

    expect(await screen.findByText(/clams and squid/i)).toBeInTheDocument();
    expect(chatQuestions).toEqual(["What bait should I use for porgy?"]);
  });

  //Opens the chat and goes back. Expects the dashboard to show again.
  it("the back button returns to the dashboard", async () => {
    await signInThroughApp();
    await openChat();

    await user.click(screen.getByRole("button", { name: UI.backToDashboard }));

    await waitForDashboard();
  });

  //An empty question can't be sent.
  it("the send button stays disabled until a question is typed", async () => {
    await signInThroughApp();
    await openChat();

    expect(screen.getByRole("button", { name: UI.send })).toBeDisabled();
    await user.type(screen.getByLabelText(UI.question), "   ");
    expect(screen.getByRole("button", { name: UI.send })).toBeDisabled();
    expect(chatQuestions).toEqual([]);
  });

  //The backend can't be reached. Expects an error message in the chat instead of a crash.
  it("shows an error message when the assistant can't be reached", async () => {
    await signInThroughApp();
    await openChat();
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });

    await ask("Where do fluke live?");

    expect(await screen.findByText(/can't reach the assistant/i)).toBeInTheDocument();
  });
});

// Picks a file in one of the profile's hidden file inputs, like a user would.
function pickFile(label: RegExp, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
}

function profilePictureSrc() {
  return document.querySelector(".profile-avatar img")?.getAttribute("src") ?? null;
}

const PHOTO = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

describe("UNIT TESTS: profile picture files (User Story 2.2)", () => {
  //Supports User Story 2.2 AC1: common photo formats from the device are accepted
  it("accepts JPEG, PNG, and WebP images", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(checkImageFile({ type, size: 1000 })).toBeNull();
    }
  });

  //SVG can contain scripts, and huge files waste storage, so both are rejected
  it("rejects SVG, non-images, and files over 10 MB", () => {
    expect(checkImageFile({ type: "image/svg+xml", size: 1000 })).not.toBeNull();
    expect(checkImageFile({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(checkImageFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull();
  });
});

describe("INTEGRATION TESTS: User Story 2.2 - Manage Profile Picture", () => {
  //Signs in, opens the profile, and picks an image from the device. Expects it to be
  //saved to the (fake) database.
  //Supports User Story 2.2 AC1
  it("AC1: the user can choose an image stored on their device", async () => {
    await signInThroughApp();
    await openProfile();

    pickFile(UI.chooseFile, PHOTO);

    await screen.findByText(UI.pictureUpdated, MESSAGE);
    expect(serverAccounts[0]).toMatchObject({ profilePicture: RESIZED_PICTURE });
  });

  //Expects the "Take photo" input to open the device camera, then takes a picture with it.
  //Supports User Story 2.2 AC2
  it("AC2: the user can take a new picture with the device camera", async () => {
    await signInThroughApp();
    await openProfile();

    const camera = screen.getByLabelText(UI.cameraFile);
    expect(camera).toHaveAttribute("capture", "user");
    pickFile(UI.cameraFile, PHOTO);

    await screen.findByText(UI.pictureUpdated, MESSAGE);
    expect(serverAccounts[0]).toMatchObject({ profilePicture: RESIZED_PICTURE });
  });

  //Expects initials before a picture is set, and the new picture in their place after.
  //Supports User Story 2.2 AC3
  it("AC3: the new image is displayed as the profile picture", async () => {
    await signInThroughApp();
    await openProfile();
    expect(profilePictureSrc()).toBeNull();

    pickFile(UI.chooseFile, PHOTO);

    await waitFor(() => expect(profilePictureSrc()).toBe(RESIZED_PICTURE));
  });

  //Picks an SVG file. Expects the file rule to be shown and nothing to be saved.
  it("an unsupported file is rejected and nothing is saved", async () => {
    await signInThroughApp();
    await openProfile();

    pickFile(UI.chooseFile, new File(["<svg></svg>"], "drawing.svg", { type: "image/svg+xml" }));

    expect(await screen.findByText(UI.pictureRule, MESSAGE)).toBeInTheDocument();
    expect(serverAccounts[0]).not.toHaveProperty("profilePicture");
    expect(profilePictureSrc()).toBeNull();
  });
});

// Opens the fish library from the dashboard's library button.
async function openLibrary() {
  await user.click(screen.getByRole("button", { name: UI.openLibrary }));
  await screen.findByRole("list", { name: UI.fishList });
}

describe("INTEGRATION TESTS: User Story 5.1 - Browse Fish Species", () => {
  //Signs in and opens the fish library from the dashboard. Expects every species in the
  //(fake) database to be shown, in alphabetical order.
  //Supports User Story 5.1 AC1
  it("AC1: the user can see the fish species contained in the database", async () => {
    await signInThroughApp();

    await openLibrary();

    const names = within(screen.getByRole("list", { name: UI.fishList }))
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual(["Bluefish", "Striped Bass"]);
  });

  //Opens a species with every detail stored. Expects all of it to be shown, including its
  //picture, then goes back to the library.
  //Supports User Story 5.1 AC2
  it("AC2: selecting a species shows the information stored for it", async () => {
    await signInThroughApp();
    await openLibrary();

    await user.click(screen.getByRole("button", { name: "Striped Bass" }));

    expect(await screen.findByRole("heading", { name: "Striped Bass" })).toBeInTheDocument();
    for (const text of [
      STRIPED_BASS.scientificName,
      /saltwater/i,
      STRIPED_BASS.features,
      STRIPED_BASS.habitat,
      STRIPED_BASS.bestBait,
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole("img", { name: "Striped Bass" })).toHaveAttribute("src", STRIPED_BASS.picture);

    await user.click(screen.getByRole("button", { name: UI.backToLibrary }));
    await screen.findByRole("list", { name: UI.fishList });
  });

  //Opens a species that only has its name stored. Expects no empty sections or picture.
  //Supports User Story 5.1 AC2 ("the available information")
  it("a species with only its name stored shows no empty details", async () => {
    await signInThroughApp();
    await openLibrary();

    await user.click(screen.getByRole("button", { name: "Bluefish" }));

    expect(await screen.findByRole("heading", { name: "Bluefish" })).toBeInTheDocument();
    expect(screen.getByText(BLUEFISH.scientificName)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /features|habitat|preferred baits & rigs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  //Opens the library and goes back. Expects the dashboard to show again.
  it("the back button returns to the dashboard", async () => {
    await signInThroughApp();
    await openLibrary();

    await user.click(screen.getByRole("button", { name: UI.backToDashboard }));

    await waitForDashboard();
  });

  //The backend can't be reached. Expects an error message instead of a crash.
  it("shows an error message when the fish database can't be reached", async () => {
    await signInThroughApp();
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });

    await user.click(screen.getByRole("button", { name: UI.openLibrary }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach the fish database/i);
  });
});

// The names of the fish showing in the library grid.
function shownFish() {
  const list = screen.queryByRole("list", { name: UI.fishList });
  return list ? within(list).getAllByRole("button").map((button) => button.textContent) : [];
}

async function searchFor(text: string) {
  const box = screen.getByLabelText(UI.searchFish);
  await user.clear(box);
  if (text) await user.type(box, text);
}

describe("INTEGRATION TESTS: User Story 5.2 - Search for Fish Species", () => {
  //Searches for a fish in the (fake) database. Expects only the matching species to be
  //shown, whatever the capital letters. Clearing the search shows every species again.
  //Supports User Story 5.2 AC1
  it("AC1: searching for a species in the database shows the matching species", async () => {
    await signInThroughApp();
    await openLibrary();

    await searchFor("STRIPED");
    expect(shownFish()).toEqual(["Striped Bass"]);

    await searchFor("bass");
    expect(shownFish()).toEqual(["Striped Bass"]);

    await searchFor("");
    expect(shownFish()).toEqual(["Bluefish", "Striped Bass"]);
  });

  //Searches, then opens the fish from the results. Expects its information to be shown.
  //Supports User Story 5.2 AC2
  it("AC2: selecting a search result shows that species' information", async () => {
    await signInThroughApp();
    await openLibrary();
    await searchFor("striped");

    await user.click(screen.getByRole("button", { name: "Striped Bass" }));

    expect(await screen.findByRole("heading", { name: "Striped Bass" })).toBeInTheDocument();
    expect(screen.getByText(STRIPED_BASS.features)).toBeInTheDocument();
  });

  //Searches for a fish that isn't in the database. Expects a message instead of an empty grid.
  it("a search with no matches says so", async () => {
    await signInThroughApp();
    await openLibrary();

    await searchFor("shark");

    expect(shownFish()).toEqual([]);
    expect(screen.getByText(UI.noMatch)).toBeInTheDocument();
  });
});
