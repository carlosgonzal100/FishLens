import { useRef, useState, type ChangeEvent } from "react";
import Brand from "../components/Brand";
import { identifyFish, shrinkPhoto, type Identification } from "../fish/identifyFish";
import { checkImageFile } from "../profile/profilePicture";
import "./FishLibraryScreen.css";
import "./IdentifyFishScreen.css";

// User Story 6.1 - Identify a Fish Using a Photo. Only signed-in users can see it.
// The user takes a photo with the camera or chooses one from the device, submits
// it, and gets one result. Picking a new photo replaces the old one.
export default function IdentifyFishScreen({
  onBack,
  onOpenFish,
}: {
  onBack: () => void;
  onOpenFish: (slug: string) => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const chooseInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<Identification | null>(null);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same photo be picked again
    if (!file) return;

    setResult(null);
    setPhoto(null);
    const problem = checkImageFile(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    try {
      setPhoto(await shrinkPhoto(file));
      setPhotoError("");
    } catch {
      setPhotoError("We couldn't read that photo. Please try another one.");
    }
  }

  // AC2: the photo is sent for identification.
  async function handleIdentify() {
    if (!photo) return;
    setIdentifying(true);
    setResult(await identifyFish(photo));
    setIdentifying(false);
  }

  return (
    <main className="library-screen">
      <section className="library-card">
        <header className="library-header">
          <button className="library-back" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <Brand />
        </header>

        <div className="library-body">
          <div className="library-title">
            <div className="title-rule" />
            <h1>Identify a Fish</h1>
            <p>Take or choose one photo of a fish, and FishLens will try to name the species.</p>
          </div>

          {/* AC1: the device camera, or a photo already on the device */}
          <div className="identify-actions">
            <button
              className="identify-button"
              type="button"
              disabled={identifying}
              onClick={() => cameraInput.current?.click()}
            >
              Take photo
            </button>
            <button
              className="identify-button"
              type="button"
              disabled={identifying}
              onClick={() => chooseInput.current?.click()}
            >
              Choose photo
            </button>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Take a photo of a fish"
              hidden
              onChange={(event) => void handlePhoto(event)}
            />
            <input
              ref={chooseInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose a photo of a fish"
              hidden
              onChange={(event) => void handlePhoto(event)}
            />
          </div>

          {photoError && <p className="library-error" role="alert">{photoError}</p>}

          {photo && (
            <div className="identify-photo">
              <img src={photo} alt="The photo to identify" />
              <button
                className="identify-button identify-submit"
                type="button"
                disabled={identifying}
                onClick={() => void handleIdentify()}
              >
                {identifying ? "Identifying…" : "Identify fish"}
              </button>
            </div>
          )}

          {result && <IdentificationResult result={result} onOpenFish={onOpenFish} />}
        </div>
      </section>
    </main>
  );
}

function IdentificationResult({
  result,
  onOpenFish,
}: {
  result: Identification;
  onOpenFish: (slug: string) => void;
}) {
  if (result.kind === "error") {
    return <p className="library-error" role="alert">{result.message}</p>;
  }

  if (result.kind === "unavailable") {
    return (
      <p className="identify-result" role="status">
        Fish identification isn't available right now. Please try again later.
      </p>
    );
  }

  // AC4
  if (result.kind === "not-identified") {
    return (
      <p className="identify-result" role="status">
        We couldn't identify this fish. Try a clear photo with the whole fish in view.
      </p>
    );
  }

  // AC3: the species, linked to its page in the fish library when we have one.
  return (
    <div className="identify-result" role="status">
      <p className="identify-label">This looks like</p>
      <h2>{result.fish ? result.fish.commonName : result.scientificName}</h2>
      {result.fish && <p className="fish-scientific">{result.scientificName}</p>}
      {result.fish ? (
        <button className="identify-button" type="button" onClick={() => onOpenFish(result.fish!.slug)}>
          See {result.fish.commonName} in the Fish Library
        </button>
      ) : (
        <p className="identify-note">This species isn't in the Fish Library yet.</p>
      )}
    </div>
  );
}
