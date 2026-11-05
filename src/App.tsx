import { useEffect, useState } from "react";
import { endSession, isSignedIn } from "./auth/session";
import SplashScreen from "./screens/SplashScreen";
import StarterScreen from "./screens/StarterScreen";
import SignInScreen from "./screens/SignInScreen";
import RegisterScreen from "./screens/RegisterScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";

type Screen = "splash" | "starter" | "sign-in" | "register" | "dashboard" | "profile";

// Screens that only signed-in users may see.
const PROTECTED_SCREENS: Screen[] = ["dashboard", "profile"];

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

  // US 1.1 / 1.4: signed-out users can't reach protected screens.
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
        <SignInScreen
          onBack={() => setScreen("starter")}
          onSuccess={() => setScreen("dashboard")}
        />
      );

    case "register":
      return <RegisterScreen onBack={() => setScreen("starter")} />;

    case "dashboard":
      return (
        <DashboardScreen
          onViewProfile={() => setScreen("profile")}
          onSignOut={() => {
            // US 1.4: sign out and return to the sign-in screen
            endSession();
            setScreen("sign-in");
          }}
        />
      );

    case "profile":
      // US 2.1: view profile
      return <ProfileScreen onBack={() => setScreen("dashboard")} />;
  }
}
