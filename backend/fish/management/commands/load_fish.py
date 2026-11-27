import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from fish.models import FishSpecies, Water

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "fish_species.json"
FIELDS = ["common_name", "scientific_name", "water", "features", "habitat", "best_bait", "picture", "more_pictures"]


class Command(BaseCommand):
    help = "Adds or updates the fish species in backend/fish/data/fish_species.json (User Story 5.1)."

    def handle(self, *args, **options):
        species = json.loads(DATA_FILE.read_text(encoding="utf-8"))

        # Catch typos before anything is saved, since the database doesn't check choices.
        for entry in species:
            if entry.get("water") not in Water.values:
                raise CommandError(f'{entry.get("slug")}: "water" must be "saltwater" or "freshwater".')

        added = 0
        for entry in species:
            # The slug identifies each species, so running this again updates
            # the existing species instead of adding copies.
            _, created = FishSpecies.objects.update_or_create(
                slug=entry["slug"],
                defaults={field: entry[field] for field in FIELDS if field in entry},
            )
            added += created
        self.stdout.write(f"Loaded {len(species)} species ({added} new, {len(species) - added} updated).")
