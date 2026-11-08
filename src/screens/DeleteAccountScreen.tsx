
import { useState } from "react";
import "./DeleteAccountScreen.css";

type Props = {
  onBack: () => void;
};

// Feature 1.7 — Delete Account
// Frontend only. Identity verification and permanent deletion
// must be enforced by the backend.
export default function DeleteAccountScreen({ onBack }: Props) {
  const [started, setStarted] = useState(false);

  return (
    <main className="delete-account-screen">
      <section className="delete-account-card">
        <button
          type="button"
          className="delete-account-back"
          onClick={onBack}
        >
          ← Back to Profile
        </button>

        <h1>Delete Account</h1>

        <p>
          Permanently deleting your account requires identity
          verification according to your current trust level.
        </p>

        <p className="delete-account-warning" role="status">
          Account deletion is not yet available. Identity
          verification and permanent deletion require backend support.
        </p>

        {!started ? (
          <button
            type="button"
            className="delete-account-button"
            onClick={() => setStarted(true)}
          >
            Delete My Account
          </button>
        ) : (
          <div className="delete-account-panel">
            <h2>Verify Your Identity</h2>

            <p>
              Before your account can be deleted, you must complete
              the authentication requirements for your current
              trust level.
            </p>

            <p role="alert">
              Verification cannot be completed until the
              authentication backend supports this action.
              Your account has not been deleted.
            </p>

            <button
              type="button"
              onClick={() => setStarted(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
