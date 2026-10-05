import { useEffect, useState } from "react";
import Brand from "../components/Brand";
import FishIllustration from "../components/FishIllustration";

// The dashboard/homepage. Only signed-in users can see it.
export default function DashboardScreen() {
  const [now, setNow] = useState(() => new Date());

  // Update the clock every second
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="dashboard-screen">
      <section className="dashboard-card">
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
