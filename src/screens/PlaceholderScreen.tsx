import AuthIllustration from "../components/AuthIllustration";

// Temporary screen for features that haven't been built yet.
export default function PlaceholderScreen({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <main className="page-shell">
      <section className="login-panel">
        <AuthIllustration onBack={onBack} />
        <div className="login-form-wrap">
          <div className="login-form-content">
            <h1>{title}</h1>
            <p>{message}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
