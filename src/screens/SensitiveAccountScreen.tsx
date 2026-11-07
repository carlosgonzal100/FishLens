import { FormEvent, useState } from "react";
import { getSignedInUsername } from "../auth/session";
import { loadAccounts } from "../auth/accounts";
import "./SensitiveAccountScreen.css";

type ChangeType = "username" | "email" | "password";
type Step = "choose" | "verify" | "edit";

// Frontend-only workflow. Identity checks and mutations MUST be enforced by a backend.
export default function SensitiveAccountScreen({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<ChangeType>("username");
  const [step, setStep] = useState<Step>("choose");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const username = getSignedInUsername();
  const account = loadAccounts().find(a => a.username === username);

  function begin(next: ChangeType) {
    setKind(next);
    setValue("");
    setError("");
    setNotice("");
    setStep("verify");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalized = value.trim().toLocaleLowerCase();
    if (kind === "username") {
      if (value.trim().length < 8 || value.trim().length > 16) {
        setError("Username must contain 8–16 characters."); return;
      }
      if (loadAccounts().some(a => a.username === normalized && a.username !== username)) {
        setError("This username is already used in this browser."); return;
      }
      setNotice("Username format is valid. Server-side availability and identity verification are required before it can be changed.");
    } else if (kind === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setError("Enter a valid email address."); return;
      }
      if (loadAccounts().some(a => a.email === normalized)) {
        setError("This email is already used in this browser."); return;
      }
      setNotice("Email format is valid. A backend must verify identity, confirm availability, and send verification to the new address. Your current email remains active until that verification succeeds.");
    } else {
      if (value.length < 8 || !/\p{L}/u.test(value) || !/\d/.test(value) || !/[^\p{L}\d\s]/u.test(value)) {
        setError("Password needs at least 8 characters, one letter, one number, and one special character."); return;
      }
      setNotice("Password format is valid. A backend must verify your identity and securely change the password.");
    }
  }

  return (
    <main className="sensitive-screen">
      <section className="sensitive-card">
        <button type="button" className="sensitive-link" onClick={onBack}>← Back to profile</button>
        <h1>Manage sensitive account information</h1>
        <p className="sensitive-note" role="status">Frontend preview only. No identity verification, email delivery, or account changes occur on this screen.</p>
        {!account ? <p role="alert">Your signed-in account could not be loaded.</p> : <>
          <p><strong>Current username:</strong> {account.username}</p>
          <p><strong>Active email:</strong> {account.email}</p>
          <div className="sensitive-actions">
            <button type="button" onClick={() => begin("username")}>Change username</button>
            <button type="button" onClick={() => begin("email")}>Change email</button>
            <button type="button" onClick={() => begin("password")}>Change password</button>
          </div>
          {step === "verify" && <div className="sensitive-panel">
            <h2>Verify identity before changing {kind}</h2>
            <p>Verification must follow your current authentication trust level. This requires the authentication backend and cannot be completed in this preview.</p>
            <button type="button" onClick={() => setStep("edit")}>Preview form (no verification)</button>
            <button type="button" className="sensitive-link" onClick={() => setStep("choose")}>Cancel</button>
          </div>}
          {step === "edit" && <form className="sensitive-panel" onSubmit={submit} noValidate>
            <h2>Preview: change {kind}</h2>
            <p className="sensitive-note">This form only validates input locally. Submitting cannot update your account.</p>
            <label htmlFor="sensitive-value">{kind === "username" ? "New username" : kind === "email" ? "New email" : "New password"}</label>
            <input id="sensitive-value" type={kind === "password" ? "password" : kind === "email" ? "email" : "text"} autoComplete={kind === "password" ? "new-password" : kind === "email" ? "email" : "username"} value={value} onChange={e => { setValue(e.target.value); setError(""); setNotice(""); }} />
            {kind === "email" && <p>Your current email ({account.email}) remains active until the new email is verified.</p>}
            {error && <p role="alert" className="sensitive-error">{error}</p>}
            {notice && <p role="status" className="sensitive-note">{notice}</p>}
            <button type="submit">Validate {kind}</button>
            <button type="button" className="sensitive-link" onClick={() => { setStep("choose"); setValue(""); setError(""); setNotice(""); }}>Cancel</button>
          </form>}
        </>}
      </section>
    </main>
  );
}
