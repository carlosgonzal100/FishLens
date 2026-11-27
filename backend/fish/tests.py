# Backend tests for User Story 5.1 - Browse Fish Species.
from io import StringIO

from django.core import signing
from django.core.management import call_command
from django.test import TestCase

from accounts.models import Account
from accounts.views import TOKEN_SALT

from .models import FishSpecies

LIST_URL = "/api/fish/"


class FishTestCase(TestCase):
    def setUp(self):
        Account.objects.create(
            first_name="Alex",
            last_name="Rivera",
            email="angler@example.com",
            username="fishfan2024",
            password="not-used-in-these-tests",
        )
        self.token = signing.dumps("fishfan2024", salt=TOKEN_SALT)

        FishSpecies.objects.create(
            slug="striped-bass",
            common_name="Striped Bass",
            scientific_name="Morone saxatilis",
            water="saltwater",
            features="Silver sides with dark stripes.",
            habitat="Bays, inlets, and the surf.",
            best_bait="Bunker and clams.",
            picture="/fish/striped-bass.jpg",
            more_pictures=["/fish/striped-bass-2.jpg"],
        )
        FishSpecies.objects.create(slug="bluefish", common_name="Bluefish", water="saltwater")

    def get(self, url, token=None):
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
        return self.client.get(url, **headers)

    # AC1: a signed-in user sees the species in the database, in alphabetical order.
    def test_list_shows_every_species_alphabetically(self):
        response = self.get(LIST_URL, self.token)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["fish"],
            [
                {"slug": "bluefish", "commonName": "Bluefish", "water": "saltwater", "picture": None},
                {
                    "slug": "striped-bass",
                    "commonName": "Striped Bass",
                    "water": "saltwater",
                    "picture": "/fish/striped-bass.jpg",
                },
            ],
        )

    # AC2: opening a species shows the information stored for it.
    def test_detail_shows_the_stored_information(self):
        response = self.get(f"{LIST_URL}striped-bass/", self.token)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["fish"],
            {
                "slug": "striped-bass",
                "commonName": "Striped Bass",
                "water": "saltwater",
                "picture": "/fish/striped-bass.jpg",
                "scientificName": "Morone saxatilis",
                "features": "Silver sides with dark stripes.",
                "habitat": "Bays, inlets, and the surf.",
                "bestBait": "Bunker and clams.",
                "morePictures": ["/fish/striped-bass-2.jpg"],
            },
        )

    def test_unknown_species_is_not_found(self):
        response = self.get(f"{LIST_URL}not-a-fish/", self.token)
        self.assertEqual(response.status_code, 404)

    # 5.1 is for signed-in users.
    def test_signed_out_users_are_refused(self):
        for url in [LIST_URL, f"{LIST_URL}striped-bass/"]:
            self.assertEqual(self.get(url).status_code, 401)
            self.assertEqual(self.get(url, "not-a-real-token").status_code, 401)

    # The data file loads, and loading it twice doesn't add copies.
    def test_load_fish_adds_the_data_file_once(self):
        FishSpecies.objects.all().delete()

        call_command("load_fish", stdout=StringIO())
        count = FishSpecies.objects.count()
        call_command("load_fish", stdout=StringIO())

        self.assertGreater(count, 0)
        self.assertEqual(FishSpecies.objects.count(), count)
        self.assertTrue(FishSpecies.objects.filter(slug="striped-bass", water="saltwater").exists())
        self.assertTrue(FishSpecies.objects.filter(slug="yellow-perch", water="freshwater").exists())
