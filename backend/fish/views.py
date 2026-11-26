from django.http import JsonResponse
from django.views.decorators.http import require_GET

from accounts.views import SIGN_IN_AGAIN, signed_in_account

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
