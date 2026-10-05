import FishIllustration from "../components/FishIllustration";

// User Story 1.1: signed-out users are offered Sign In or Register.
export default function StarterScreen({
  onSignIn,
  onRegister,
}: {
  onSignIn: () => void;
  onRegister: () => void;
}) {
  return (
    <main className="page-shell">
      <section className="starter-panel">
        <div className="starter-content">
          <div className="title-rule" />
          <h1>Fish Field Guide</h1>
          <p className="title-subtitle">For Anglers</p>
          <div className="starter-actions">
            <button className="button button-primary" type="button" onClick={onSignIn}>
              Sign In
            </button>
            <button className="button button-secondary" type="button" onClick={onRegister}>
              Register
            </button>
          </div>
        </div>

        <aside className="book-panel">
          <FishIllustration />
        </aside>
      </section>
    </main>
  );
}
