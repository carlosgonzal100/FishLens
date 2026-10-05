import Brand from "./Brand";
import FishIllustration from "./FishIllustration";

// The left-hand panel on the Sign In and Register screens, with a Back button.
export default function AuthIllustration({ onBack }: { onBack: () => void }) {
  return (
    <div className="login-illustration">
      <button className="back-button" type="button" onClick={onBack} aria-label="Back">
        <span aria-hidden="true">←</span> Back
      </button>
      <div className="login-plate">
        <FishIllustration compact />
      </div>
      <Brand />
    </div>
  );
}
