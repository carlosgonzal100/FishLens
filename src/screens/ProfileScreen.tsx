import { useState } from "react";
import { getCurrentProfile, getInitials } from "../profile/profile";
import { loadCatches, summarizeCatches } from "../catches/catches";
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

// User Story 2.1 — View Profile
export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("summary");
  const profile = getCurrentProfile();

  if (!profile) {
    return (
      <main className="dashboard-screen">
        <section className="dashboard-card profile-card">
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

  return (
    <main className="dashboard-screen">
      <section className="dashboard-card profile-card">
        <button className="profile-back" type="button" onClick={onBack}>
          ← Back
        </button>

        {/* AC: first name, last name, username, and profile picture */}
        <header className="profile-header">
          <div className="profile-avatar" role="img" aria-label="Profile picture">
            {getInitials(profile)}
          </div>
          <div>
            <h1>
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="profile-username">@{profile.username}</p>
          </div>
        </header>

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
