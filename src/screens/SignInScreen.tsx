import { FormEvent, useState } from "react";
import AuthIllustration from "../components/AuthIllustration";
import { signInToAccount } from "../auth/accounts";
import { saveSessionToken, startSession } from "../auth/session";

// User Story 1.3 — Sign In
export default function SignInScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // stop the page from reloading

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLocaleLowerCase();
    const password = String(form.get("password") ?? "");
    const result = await signInToAccount(username, password);

    // AC: wrong username or password shows this exact message and lets them retry
    if ("error" in result) {
      setError(result.error);
      return;
    }

    // AC: correct username and password signs in and opens the dashboard.
    // The username is saved too, so the profile knows who is signed in (US 2.1).
    saveSessionToken(result.token);
    startSession(username);
    setError("");
    onSuccess();
  };

  return (
    <main className="page-shell">
      <section className="login-panel">
        <AuthIllustration onBack={onBack} />

        <div className="login-form-wrap">
          <div className="login-form-content">
            <h1>Sign In</h1>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <p className="form-message form-error" role="alert">
                  {error}
                </p>
              )}

              <label htmlFor="signInUsername">Username</label>
              <input id="signInUsername" name="username" type="text" autoComplete="username" />

              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" />

              <button className="button button-primary submit-button" type="submit">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
