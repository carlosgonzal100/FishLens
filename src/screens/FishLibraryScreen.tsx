import { useEffect, useState } from "react";
import Brand from "../components/Brand";
import { loadFish, loadFishList, type FishCard, type FishDetails } from "../fish/fishDatabase";
import "./FishLibraryScreen.css";

// User Story 5.1 - Browse Fish Species. Only signed-in users can see it.
// Shows every species in the database as a grid of cards. Clicking one opens
// the information stored for it. User Story 5.2 adds a search box above the grid.
export default function FishLibraryScreen({ onBack }: { onBack: () => void }) {
  const [fishList, setFishList] = useState<FishCard[] | null>(null);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<FishDetails | null>(null);
  const [detailError, setDetailError] = useState("");
  const [search, setSearch] = useState("");

  // User Story 5.2: only the fish whose name contains the search text. Capital
  // letters don't matter, and other names in brackets count too, so "tautog"
  // finds "Blackfish (Tautog)".
  const searchText = search.trim().toLowerCase();
  const matchingFish = fishList?.filter((fish) => fish.commonName.toLowerCase().includes(searchText));

  useEffect(() => {
    let active = true;
    void loadFishList().then((result) => {
      if (!active) return;
      if ("data" in result) setFishList(result.data);
      else setListError(result.error);
    });
    return () => {
      active = false;
    };
  }, []);

  async function openFish(slug: string) {
    setDetailError("");
    const result = await loadFish(slug);
    if ("data" in result) setSelected(result.data);
    else setDetailError(result.error);
  }

  return (
    <main className="library-screen">
      <section className="library-card">
        <header className="library-header">
          {selected ? (
            <button className="library-back" type="button" onClick={() => setSelected(null)}>
              <span aria-hidden="true">←</span> Fish Library
            </button>
          ) : (
            <button className="library-back" type="button" onClick={onBack}>
              <span aria-hidden="true">←</span> Dashboard
            </button>
          )}
          <Brand />
        </header>

        <div className="library-body">
          {selected ? (
            <FishInformation fish={selected} />
          ) : (
            <>
              <div className="library-title">
                <div className="title-rule" />
                <h1>Fish Library</h1>
                <p>Fish species found on Long Island, New York.</p>
              </div>

              {listError && <p className="library-error" role="alert">{listError}</p>}
              {detailError && <p className="library-error" role="alert">{detailError}</p>}
              {!fishList && !listError && <p className="library-loading">Loading fish…</p>}
              {fishList?.length === 0 && <p className="library-loading">No fish have been added yet.</p>}

              {fishList && fishList.length > 0 && (
                <div className="library-search">
                  <label htmlFor="fish-search">Search fish</label>
                  <input
                    id="fish-search"
                    type="search"
                    placeholder="Search by name, like striped bass or fluke"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              )}

              {fishList && fishList.length > 0 && matchingFish?.length === 0 && (
                <p className="library-loading">No fish match "{search.trim()}".</p>
              )}

              {matchingFish && matchingFish.length > 0 && (
                <ul className="library-grid" aria-label="Fish species">
                  {matchingFish.map((fish) => (
                    <li key={fish.slug}>
                      <button className="library-fish" type="button" onClick={() => void openFish(fish.slug)}>
                        {fish.picture && <img src={fish.picture} alt="" />}
                        <span>{fish.commonName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

// AC2: the information stored for one species. Anything not added yet is left out.
function FishInformation({ fish }: { fish: FishDetails }) {
  const sections = [
    { heading: "Features", text: fish.features },
    { heading: "Habitat", text: fish.habitat },
    { heading: "Preferred baits & rigs", text: fish.bestBait },
  ].filter((section) => section.text);
  const pictures = [fish.picture, ...fish.morePictures].filter(Boolean) as string[];

  return (
    <article className="fish-info">
      <h1>{fish.commonName}</h1>
      {fish.scientificName && <p className="fish-scientific">{fish.scientificName}</p>}
      <p className="fish-water">{fish.water === "freshwater" ? "Freshwater" : "Saltwater"}</p>

      {pictures.length > 0 && (
        <div className="fish-pictures">
          {pictures.map((picture) => (
            <img key={picture} src={picture} alt={fish.commonName} />
          ))}
        </div>
      )}

      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.text}</p>
        </section>
      ))}

      {sections.length === 0 && pictures.length === 0 && (
        <p className="library-loading">More information about this fish hasn't been added yet.</p>
      )}
    </article>
  );
}
