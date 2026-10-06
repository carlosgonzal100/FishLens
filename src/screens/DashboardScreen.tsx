import { useEffect, useState } from "react";
import Brand from "../components/Brand";
import FishIllustration from "../components/FishIllustration";

// The dashboard/homepage. Only signed-in users can see it.
export default function DashboardScreen({ onSignOut }: { onSignOut: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Update the clock every second
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="dashboard-screen">
      <section className="dashboard-card">
        {/* User Story 1.4: profile menu with Sign Out */}
        <div className="profile-menu">
          <button
            className="profile-button"
            type="button"
            aria-label="Profile"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.8 20c.7-4 3.1-6 7.2-6s6.5 2 7.2 6" />
            </svg>
          </button>
          {profileMenuOpen && (
            <div className="profile-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={onSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </div>
        <Brand />
        <FishIllustration compact />
        <div className="dashboard-content">
          <h1>this is the landing screen</h1>
          <time dateTime={now.toISOString()}>
            <span>
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <strong>
              {now.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </strong>
          </time>
        </div>
      </section>
    </main>
  );
}
