import Brand from "../components/Brand";
import FishIllustration from "../components/FishIllustration";

// Shown briefly every time the app opens.
export default function SplashScreen() {
  return (
    <main className="splash-screen">
      <div className="splash-frame">
        <FishIllustration compact />
        <Brand />
      </div>
    </main>
  );
}
