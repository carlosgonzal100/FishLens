import { FormEvent, useState } from "react";
import AuthIllustration from "../components/AuthIllustration";
import { addAccount, hashPassword, loadAccounts } from "../auth/accounts";

type RegistrationErrors = Partial<
  Record<"form" | "firstName" | "lastName" | "email" | "username" | "password", string>
>;

// User Story 1.2 — Register an Account
export default function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // stop the page from reloading
    setSuccess("");
    const formElement = event.currentTarget;

    const form = new FormData(formElement);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nextErrors: RegistrationErrors = {};

    // AC: all fields are required
    if (!firstName || !lastName || !email || !username || !password) {
      nextErrors.form = "All fields are required.";
    }

    // AC: first/last name must be 3–20 letters, no numbers or symbols
    const validName = /^\p{L}{3,20}$/u;
    if (firstName && !validName.test(firstName)) {
      nextErrors.firstName = "First name must contain 3 to 20 letters only.";
    }
    if (lastName && !validName.test(lastName)) {
      nextErrors.lastName = "Last name must contain 3 to 20 letters only.";
    }

    // AC: email must have a valid format
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !validEmail.test(email)) {
      nextErrors.email = "Email must have a valid format.";
    }

    // AC: username must be 8–16 characters
    if (username && (username.length < 8 || username.length > 16)) {
      nextErrors.username = "Username must contain between 8 and 16 characters.";
    }

    // AC: password needs 8+ characters with a letter, a number, and a special character
    const hasLetter = /\p{L}/u.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialCharacter = /[^\p{L}\d\s]/u.test(password);
    if (password && (password.length < 8 || !hasLetter || !hasNumber || !hasSpecialCharacter)) {
      nextErrors.password =
        "Password must contain at least 8 characters, including one letter, one number, and one special character.";
    }

    // AC: username and email must not already be in use
    const normalizedEmail = email.toLocaleLowerCase();
    const normalizedUsername = username.toLocaleLowerCase();
    if (
      Object.keys(nextErrors).length === 0 &&
      loadAccounts().some(
        (account) => account.email === normalizedEmail || account.username === normalizedUsername,
      )
    ) {
      nextErrors.form = "Username or email is already in use.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return; // something is wrong, so don't create the account
    }

    // AC: everything is valid, so create the account
    addAccount({
      firstName,
      lastName,
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: await hashPassword(password),
    });
    formElement.reset();
    setSuccess("Account successfully created.");
  };

  return (
    <main className="page-shell">
      <section className="login-panel register-panel">
        <AuthIllustration onBack={onBack} />

        <div className="login-form-wrap">
          <div className="login-form-content">
            <h1>Register</h1>

            <form onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <p className="form-message form-error" role="alert">
                  {errors.form}
                </p>
              )}
              {success && (
                <p className="form-message form-success" role="status">
                  {success}
                </p>
              )}

              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" type="text" autoComplete="given-name" />
              {errors.firstName && <p className="field-error">{errors.firstName}</p>}

              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" type="text" autoComplete="family-name" />
              {errors.lastName && <p className="field-error">{errors.lastName}</p>}

              <label htmlFor="registerEmail">Email</label>
              <input id="registerEmail" name="email" type="email" autoComplete="email" />
              {errors.email && <p className="field-error">{errors.email}</p>}

              <label htmlFor="username">Username</label>
              <input id="username" name="username" type="text" autoComplete="username" />
              {errors.username && <p className="field-error">{errors.username}</p>}

              <label htmlFor="registerPassword">Password</label>
              <input
                id="registerPassword"
                name="password"
                type="password"
                autoComplete="new-password"
              />
              {errors.password && <p className="field-error">{errors.password}</p>}

              <button className="button button-primary submit-button" type="submit">
                Register
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
