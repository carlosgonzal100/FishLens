# Backend tests for User Stories 5.1 (Browse Fish Species) and 6.1 (Identify a Fish Using a Photo).
import base64
import json
from io import StringIO
from unittest import mock

import httpx2
from django.core import signing
from django.core.management import call_command
from django.test import TestCase

from accounts.models import Account
from accounts.views import TOKEN_SALT

from . import identify_service
from .models import FishSpecies

LIST_URL = "/api/fish/"


class FishTestCase(TestCase):
    """A signed-in account and two fish, shared by the 5.1 and 6.1 tests."""

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


class BrowseFishTests(FishTestCase):
    """User Story 5.1 - Browse Fish Species"""

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


# User Story 6.1 - Identify a Fish Using a Photo.
# Fishial is never really called: the service talks to a fake network, so the tests
# are free, need no key, and don't use any of the 100 monthly credits.
IDENTIFY_URL = "/api/fish/identify/"
JPEG = b"\xff\xd8\xff\xe0" + b"photo" * 20
PHOTO = "data:image/jpeg;base64," + base64.b64encode(JPEG).decode()


def fishial_recognition(*species):
    # The shape of Fishial's recognition reply: one fish with its possible species.
    return {"results": [{"shape": [], "species": [{"name": name, "accuracy": accuracy} for name, accuracy in species]}]}


class IdentifyFishTests(FishTestCase):
    """User Story 6.1 - Identify a Fish Using a Photo"""

    def setUp(self):
        super().setUp()
        self.calls = []  # every request the fake Fishial received
        self.recognition = fishial_recognition(("Morone saxatilis", 0.94), ("Morone americana", 0.03))
        self.failure = None  # set to make one step fail
        patcher = mock.patch.object(identify_service, "make_client", side_effect=self.fake_fishial)
        patcher.start()
        self.addCleanup(patcher.stop)

    def fake_fishial(self):
        def handle(request):
            url = str(request.url)
            self.calls.append((request.method, url))
            if self.failure and self.failure[0] in url:
                if isinstance(self.failure[1], Exception):
                    raise self.failure[1]
                return httpx2.Response(self.failure[1])
            if url == identify_service.TOKEN_URL:
                return httpx2.Response(200, json={"token_type": "Bearer", "access_token": "fake-token"})
            if url == identify_service.UPLOAD_URL:
                blob = json.loads(request.content)["blob"]
                self.assertEqual(blob["byte_size"], len(JPEG))
                return httpx2.Response(200, json={
                    "signed-id": "fake-signed-id",
                    "direct-upload": {"url": "https://storage.example/upload", "headers": {"Content-MD5": blob["checksum"]}},
                })
            if url == "https://storage.example/upload":
                self.assertEqual(request.content, JPEG)
                return httpx2.Response(200)
            if url.startswith(identify_service.RECOGNIZE_URL):
                self.assertIn("q=fake-signed-id", url)
                return httpx2.Response(200, json=self.recognition)
            return httpx2.Response(404)

        return httpx2.Client(transport=httpx2.MockTransport(handle))

    def identify(self, photo=PHOTO, token=None):
        return self.client.post(
            IDENTIFY_URL,
            data=json.dumps({"photo": photo}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token or self.token}",
        )

    # AC2 and AC3: the photo goes through all 4 Fishial steps, and the species is
    # returned and linked to its fish page.
    def test_ac3_an_identified_fish_is_returned_and_linked_to_its_page(self):
        response = self.identify()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "identified": True,
            "scientificName": "Morone saxatilis",
            "accuracy": 0.94,
            "fish": {"slug": "striped-bass", "commonName": "Striped Bass"},
            "source": "fishial",
        })
        self.assertEqual([method for method, _ in self.calls], ["POST", "POST", "PUT", "GET"])

    def test_a_species_not_in_the_database_is_shown_without_a_link(self):
        self.recognition = fishial_recognition(("Esox lucius", 0.97))

        response = self.identify()

        self.assertEqual(response.json()["scientificName"], "Esox lucius")
        self.assertIsNone(response.json()["fish"])

    # AC4: no fish found, or Fishial not sure enough, means "couldn't identify".
    def test_ac4_a_fish_that_cant_be_identified_says_so(self):
        for recognition in [{"results": []}, fishial_recognition(("Morone saxatilis", 0.4))]:
            self.recognition = recognition
            self.assertEqual(self.identify().json(), {"identified": False, "source": "fishial"})

    # Fallback: if any Fishial step fails, the reply says so instead of an error page.
    def test_fishial_failures_fall_back(self):
        for failure in [
            (identify_service.TOKEN_URL, 401),  # bad key
            (identify_service.UPLOAD_URL, 429),  # out of credits or rate limited
            ("storage.example", 500),
            (identify_service.RECOGNIZE_URL, 503),
            (identify_service.RECOGNIZE_URL, httpx2.ReadTimeout("slow")),
            (identify_service.TOKEN_URL, httpx2.ConnectError("no connection")),
        ]:
            self.failure = failure
            self.assertEqual(
                self.identify().json(),
                {"identified": False, "unavailable": True, "source": "fallback"},
                failure,
            )

    def test_anything_but_a_jpeg_is_refused_before_fishial_is_called(self):
        too_big = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"x" * (1536 * 1024)).decode()
        for photo in ["", "not a photo", "data:image/png;base64,iVBORw0KGgo=", "data:image/jpeg;base64,!!!", too_big]:
            self.assertEqual(self.identify(photo).status_code, 400)
        self.assertEqual(self.calls, [])

    def test_signed_out_users_are_refused(self):
        self.assertEqual(self.identify(token="not-a-real-token").status_code, 401)
        self.assertEqual(self.calls, [])
