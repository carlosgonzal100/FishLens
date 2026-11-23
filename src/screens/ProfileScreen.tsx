import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { updateProfilePicture } from "../auth/accounts";
import { getCurrentProfile, getInitials, saveProfileName, type NameErrors } from "../profile/profile";
import { loadCatches, summarizeCatches } from "../catches/catches";
import { checkImageFile, getCurrentPicture, resizeImage } from "../profile/profilePicture";
import "./ProfileScreen.css";

type Tab = "summary" | "history";

// Dates are saved as "YYYY-MM-DD". Formatting them in UTC stops them from
// showing up one day early in time zones behind UTC, like New York.
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

type PictureMessage = { kind: "error" | "success"; text: string } | null;

// User Stories 2.1 (View Profile), 2.2 (Manage Profile Picture),
// and 2.3 (Edit Profile Information)
export default function ProfileScreen({
  onBack,
  onAuthenticationSettings,
  onManageSensitiveAccount,
  onDeleteAccount,
}: {
  onBack: () => void;
  onAuthenticationSettings: () => void;
  onManageSensitiveAccount: () => void;
  onDeleteAccount: () => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<NameErrors>({});
  const [pictureMessage, setPictureMessage] = useState<PictureMessage>(null);
  const [uploading, setUploading] = useState(false);
  const chooseInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const profile = getCurrentProfile();

  // US 2.2: use a picture from the device or the camera as the profile picture
  const handlePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ""; // lets the same file be picked again later
    if (!file) return;

    const problem = checkImageFile(file);
    if (problem) {
      setPictureMessage({ kind: "error", text: problem });
      return;
    }

    setUploading(true);
    try {
      const errors = await updateProfilePicture(await resizeImage(file));
      setPictureMessage(
        errors.form
          ? { kind: "error", text: errors.form }
          : { kind: "success", text: "Profile picture updated." },
      );
    } catch {
      setPictureMessage({ kind: "error", text: "We couldn't use that picture. Please try another one." });
    } finally {
      setUploading(false);
    }
  };

  // US 2.3: save the new name, or show which rule it broke
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // stop the page from reloading
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const nextErrors = await saveProfileName(
      String(form.get("firstName") ?? ""),
      String(form.get("lastName") ?? ""),
    );
    setSaving(false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setEditing(false);
      setSaved(true);
    }
  };

  const startEditing = () => {
    setErrors({});
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setErrors({});
    setEditing(false);
  };

  if (!profile) {
    return (
      <main className="dashboard-screen">
        <section className="profile-card">
          <p role="alert">We couldn't load your profile. Please sign out and sign in again.</p>
          <button className="button button-primary" type="button" onClick={onBack}>
            Back
          </button>
        </section>
      </main>
    );
  }

  const catches = loadCatches(profile.username);
  const summary = summarizeCatches(catches);
  const picture = getCurrentPicture();

  return (
    <main className="dashboard-screen">
      <section className="profile-card">
        <button className="profile-back" type="button" onClick={onBack}>
          ← Back
        </button>

        {/* AC: first name, last name, username, and profile picture */}
        <header className="profile-header">
          <div className="profile-avatar" role="img" aria-label="Profile picture">
            {picture ? <img src={picture} alt="" /> : getInitials(profile)}
          </div>
          <div>
            <h1>
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="profile-username">@{profile.username}</p>
          </div>
          {!editing && (
            <button className="profile-edit-button" type="button" onClick={startEditing}>
              Edit name
            </button>
          )}
        </header>

        {/* US 2.2: choose an existing image, or take a new one with the camera */}
        <div className="profile-picture-actions">
          <button
            className="profile-edit-button"
            type="button"
            disabled={uploading}
            onClick={() => chooseInput.current?.click()}
          >
            Choose photo
          </button>
          <button
            className="profile-edit-button"
            type="button"
            disabled={uploading}
            onClick={() => cameraInput.current?.click()}
          >
            Take photo
          </button>
          <input
            ref={chooseInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a profile picture"
            hidden
            onChange={handlePicture}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            aria-label="Take a profile picture"
            hidden
            onChange={handlePicture}
          />
        </div>

        {pictureMessage && (
          <p
            className={`form-message ${pictureMessage.kind === "error" ? "form-error" : "form-success"}`}
            role={pictureMessage.kind === "error" ? "alert" : "status"}
          >
            {pictureMessage.text}
          </p>
        )}

        {saved && (
          <p className="form-message form-success" role="status">
            Your name was updated.
          </p>
        )}

        {/* US 2.3: edit first and last name */}
        {editing && (
          <form className="profile-edit" onSubmit={handleSave} noValidate>
            {errors.form && (
              <p className="form-message form-error" role="alert">
                {errors.form}
              </p>
            )}

            <label htmlFor="editFirstName">First name</label>
            <input
              id="editFirstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              defaultValue={profile.firstName}
            />
            {errors.firstName && <p className="field-error">{errors.firstName}</p>}

            <label htmlFor="editLastName">Last name</label>
            <input
              id="editLastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              defaultValue={profile.lastName}
            />
            {errors.lastName && <p className="field-error">{errors.lastName}</p>}

            <div className="profile-edit-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="profile-cancel-button" type="button" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <button
          className="button button-primary"
          type="button"
          onClick={onAuthenticationSettings}
        >
          Authentication Settings
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onManageSensitiveAccount}
        >
          Manage Sensitive Account
        </button>
        <button
           className="button button-secondary"
            type="button"
            onClick={onDeleteAccount}
        >
            Delete Account
        </button>

        <div className="profile-tabs" role="tablist" aria-label="Profile sections">
          <button
            type="button"
            role="tab"
            id="profile-tab-summary"
            aria-selected={tab === "summary"}
            aria-controls="profile-panel-summary"
            onClick={() => setTab("summary")}
          >
            Summary
          </button>
          <button
            type="button"
            role="tab"
            id="profile-tab-history"
            aria-selected={tab === "history"}
            aria-controls="profile-panel-history"
            onClick={() => setTab("history")}
          >
            Catch History
          </button>
        </div>

        {tab === "summary" ? (
          // AC: fishing summary with number of fish caught and biggest fish
          <div
            role="tabpanel"
            id="profile-panel-summary"
            aria-labelledby="profile-tab-summary"
            className="profile-stats"
          >
            <div className="profile-stat">
              <strong>{summary.totalCaught}</strong>
              <span>Fish caught</span>
            </div>
            <div className="profile-stat">
              <strong>{summary.biggest ? `${summary.biggest.weightLb} lb` : "—"}</strong>
              <span>{summary.biggest ? `Biggest fish (${summary.biggest.species})` : "Biggest fish"}</span>
            </div>
          </div>
        ) : (
          // AC: the Catch History tab shows previously recorded catches
          <div role="tabpanel" id="profile-panel-history" aria-labelledby="profile-tab-history">
            {catches.length === 0 ? (
              <p className="profile-empty">No catches yet. Catches you record will show up here.</p>
            ) : (
              <ul className="catch-list">
                {catches.map((c) => (
                  <li key={c.id} className="catch-item">
                    <div>
                      <strong>{c.species}</strong>
                      <span>
                        {formatDate(c.caughtAt)} · {c.location}
                      </span>
                    </div>
                    <span>{c.weightLb} lb</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
