import { useEffect, useState } from "react";
import Brand from "../components/Brand";
import FishIllustration from "../components/FishIllustration";

// The dashboard/homepage. Only signed-in users can see it.
export default function DashboardScreen({
  onSignOut,
  onViewProfile,
  onOpenChat,
  onOpenLibrary,
  onIdentifyFish,
}: {
  onSignOut: () => void;
  onViewProfile: () => void;
  onOpenChat: () => void;
  onOpenLibrary: () => void;
  onIdentifyFish: () => void;
}) {
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
        {/* User Stories 1.4 and 2.1: profile menu with View Profile and Sign Out */}
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
              <button type="button" role="menuitem" onClick={onViewProfile}>
                View Profile
              </button>
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
        {/* User Story 6.1: identify a fish from a photo */}
        <button
          className="identify-open-button"
          type="button"
          aria-label="Identify a fish"
          title="Identify a fish from a photo"
          onClick={onIdentifyFish}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
        {/* User Story 5.1: opens the fish library */}
        <button
          className="library-open-button"
          type="button"
          aria-label="Fish library"
          title="Browse the fish library"
          onClick={onOpenLibrary}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
            <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13Z" />
            <path d="M6.5 8h2M6.5 11h2M15.5 8h2M15.5 11h2" />
          </svg>
        </button>
        {/* User Story 6.2: opens the AI assistant chat */}
        <button
          className="chat-open-button"
          type="button"
          aria-label="AI assistant"
          title="Ask the AI assistant"
          onClick={onOpenChat}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8.5L6 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5Z" />
            <path d="M8 9h8M8 12h5" />
          </svg>
        </button>
      </section>
    </main>
  );
}
