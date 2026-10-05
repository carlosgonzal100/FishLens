import { useEffect, useState } from "react";
import { isSignedIn } from "./auth/session";
import SplashScreen from "./screens/SplashScreen";
import StarterScreen from "./screens/StarterScreen";
import DashboardScreen from "./screens/DashboardScreen";
import PlaceholderScreen from "./screens/PlaceholderScreen";

type Screen = "splash" | "starter" | "sign-in" | "register" | "dashboard";

// Screens that only signed-in users may see.
const PROTECTED_SCREENS: Screen[] = ["dashboard"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");

  // When the app opens: show the splash, then go to the dashboard if already
  // signed in (US 1.1), otherwise to the starter screen.
  useEffect(() => {
    if (screen !== "splash") return;
    const timer = window.setTimeout(() => {
      setScreen(isSignedIn() ? "dashboard" : "starter");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [screen]);

  // US 1.1: signed-out users can't reach protected screens.
  const current: Screen =
    PROTECTED_SCREENS.includes(screen) && !isSignedIn() ? "starter" : screen;

  switch (current) {
    case "splash":
      return <SplashScreen />;

    case "starter":
      return (
        <StarterScreen
          onSignIn={() => setScreen("sign-in")}
          onRegister={() => setScreen("register")}
        />
      );

    case "sign-in":
      return (
        <PlaceholderScreen
          title="Sign In"
          message="Coming in User Story 1.3."
          onBack={() => setScreen("starter")}
        />
      );

    case "register":
      return (
        <PlaceholderScreen
          title="Register"
          message="Coming in User Story 1.2."
          onBack={() => setScreen("starter")}
        />
      );

    case "dashboard":
      return <DashboardScreen />;
  }
}
