import base64
import binascii

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from accounts.views import SIGN_IN_AGAIN, read_json, signed_in_account

from .identify_service import FishialError, identify_photo
from .models import FishSpecies


def fish_card(fish):
    # What the library grid needs for each species.
    return {
        "slug": fish.slug,
        "commonName": fish.common_name,
        "water": fish.water,
        "picture": fish.picture or None,
    }


def fish_details(fish):
    return {
        **fish_card(fish),
        "scientificName": fish.scientific_name,
        "features": fish.features,
        "habitat": fish.habitat,
        "bestBait": fish.best_bait,
        "morePictures": fish.more_pictures,
    }


@require_GET
def species_list(request):
    """User Story 5.1 AC1: browse the fish species in the database."""
    if not signed_in_account(request):
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    # Alphabetical, from the model's ordering.
    return JsonResponse({"fish": [fish_card(fish) for fish in FishSpecies.objects.all()]})


@require_GET
def species_detail(request, slug):
    """User Story 5.1 AC2: view the information stored for one species."""
    if not signed_in_account(request):
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    fish = FishSpecies.objects.filter(slug=slug).first()
    if not fish:
        return JsonResponse({"errors": {"form": "That fish isn't in the database."}}, status=404)

    return JsonResponse({"fish": fish_details(fish)})


# User Story 6.1: the app sends a JPEG shrunk to at most 1024 pixels, so a real
# photo is well under this limit.
PHOTO_PREFIX = "data:image/jpeg;base64,"
MAX_PHOTO_BYTES = 1536 * 1024  # stays under Django's 2.5 MB request limit once base64-encoded
JPEG_START = b"\xff\xd8\xff"  # the first bytes of every JPEG file

# Fishial sometimes uses an older scientific name than our data file.
OLDER_NAMES = {"micropterus salmoides": "micropterus nigricans"}  # largemouth bass


def read_photo(data):
    # Never trust what the app sends: check that it really is a JPEG and small enough.
    photo = data.get("photo")
    if not isinstance(photo, str) or not photo.startswith(PHOTO_PREFIX):
        return None
    try:
        decoded = base64.b64decode(photo.removeprefix(PHOTO_PREFIX), validate=True)
    except (binascii.Error, ValueError):
        return None
    if not decoded.startswith(JPEG_START) or len(decoded) > MAX_PHOTO_BYTES:
        return None
    return decoded


def species_in_database(scientific_name):
    # Links the result to its fish page (5.1) when the species is in our database.
    name = scientific_name.strip().lower()
    name = OLDER_NAMES.get(name, name)
    fish = FishSpecies.objects.filter(scientific_name__iexact=name).first()
    return {"slug": fish.slug, "commonName": fish.common_name} if fish else None


@require_POST
def identify(request):
    """User Story 6.1 - Identify a Fish Using a Photo"""
    # Signed-in users only. This also stops strangers from using the Fishial credits.
    if not signed_in_account(request):
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    data = read_json(request)
    photo = read_photo(data) if data is not None else None
    if photo is None:
        return JsonResponse({"errors": {"form": "Please choose a JPEG photo under 1.5 MB."}}, status=400)

    try:
        result = identify_photo(photo)
    except FishialError:
        # Fishial is down, slow, or out of credits. The app can identify on the
        # device instead.
        return JsonResponse({"identified": False, "unavailable": True, "source": "fallback"})

    if not result["identified"]:
        # AC4: no fish found, or Fishial isn't sure enough.
        return JsonResponse({"identified": False, "source": "fishial"})

    # AC3: the identified species, linked to its fish page when we have one.
    return JsonResponse({
        **result,
        "fish": species_in_database(result["scientificName"]),
        "source": "fishial",
    })
