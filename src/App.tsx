
import { useEffect, useState } from "react";
import { loadSignedInAccount } from "./auth/accounts";
import { endSession, isSignedIn } from "./auth/session";
import SplashScreen from "./screens/SplashScreen";
import StarterScreen from "./screens/StarterScreen";
import SignInScreen from "./screens/SignInScreen";
import RegisterScreen from "./screens/RegisterScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AuthenticationSettings from "./AuthenticationSettings";
import SensitiveAccountScreen from "./screens/SensitiveAccountScreen";
import DeleteAccountScreen from "./screens/DeleteAccountScreen";
import ChatScreen from "./screens/ChatScreen";
import FishLibraryScreen from "./screens/FishLibraryScreen";
import IdentifyFishScreen from "./screens/IdentifyFishScreen";

type Screen =
  | "splash"
  | "starter"
  | "sign-in"
  | "register"
  | "dashboard"
  | "profile"
  | "authentication-settings"
  | "sensitive-account"
  | "delete-account"
  | "chat"
  | "fish-library"
  | "identify-fish";

// Screens that only signed-in users may see.
const PROTECTED_SCREENS: Screen[] = [
  "dashboard",
  "profile",
  "authentication-settings",
  "sensitive-account",
  "delete-account",
  "chat",
  "fish-library",
  "identify-fish",
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  // User Story 6.1: the identified fish the library opens to, if any.
  const [libraryFish, setLibraryFish] = useState<string | undefined>();

  // When the app opens: show the splash, then go to the dashboard if already
  // signed in (US 1.1), otherwise to the starter screen. A saved token the
  // backend rejects signs the user out. If the backend can't be reached, they
  // stay signed in.
  useEffect(() => {
    if (screen !== "splash") return;
    const timer = window.setTimeout(async () => {
      if (isSignedIn() && (await loadSignedInAccount()) === "rejected") {
        endSession();
      }
      setScreen(isSignedIn() ? "dashboard" : "starter");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [screen]);

  // US 1.1 / 1.4: signed-out users can't reach protected screens.
  const current: Screen =
    PROTECTED_SCREENS.includes(screen) && !isSignedIn()
      ? "starter"
      : screen;

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
          onViewProfile={async () => {
            await loadSignedInAccount();
            setScreen("profile");
          }}
          onSignOut={() => {
            // US 1.4: sign out and return to the sign-in screen
            endSession();
            setScreen("sign-in");
          }}
          onOpenChat={() => setScreen("chat")}
          onOpenLibrary={() => {
            setLibraryFish(undefined);
            setScreen("fish-library");
          }}
          onIdentifyFish={() => setScreen("identify-fish")}
        />
      );

    case "fish-library":
      // User Story 5.1: browse the fish database
      return <FishLibraryScreen key={libraryFish} openSlug={libraryFish} onBack={() => setScreen("dashboard")} />;

    case "identify-fish":
      // User Story 6.1: identify a fish from a photo
      return (
        <IdentifyFishScreen
          onBack={() => setScreen("dashboard")}
          onOpenFish={(slug) => {
            setLibraryFish(slug);
            setScreen("fish-library");
          }}
        />
      );

    case "chat":
      // User Story 6.2: the AI assistant
      return <ChatScreen onBack={() => setScreen("dashboard")} />;

    case "profile":
      return (
        <ProfileScreen
          onBack={() => setScreen("dashboard")}
          onAuthenticationSettings={() => setScreen("authentication-settings")}
          onManageSensitiveAccount={() => setScreen("sensitive-account")}
          onDeleteAccount={() => setScreen("delete-account")}
        />
      );

    case "authentication-settings":
      return <AuthenticationSettings onBack={() => setScreen("profile")} />;

    case "sensitive-account":
      return <SensitiveAccountScreen onBack={() => setScreen("profile")} />;
    
    case "delete-account":
       return  <DeleteAccountScreen onBack={() => setScreen("profile")} />;

    default:
      return <StarterScreen onSignIn={() => setScreen("sign-in")} onRegister={() => setScreen("register")} />;
  }
}