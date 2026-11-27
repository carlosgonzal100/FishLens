"""User Story 6.1 - Identify a Fish Using a Photo, with the Fishial.ai API.

All Fishial code lives here, not in views, so the steps, timeout, and fallback
are in one place and tests can pass in a fake network. The keys come from
FISHIAL_CLIENT_ID and FISHIAL_CLIENT_SECRET and never leave the server.

One identification is 4 calls (from Fishial's developer docs):
  1. get a login token
  2. ask for an upload link for the photo
  3. upload the photo to that link
  4. ask Fishial to recognize the uploaded photo
"""

import base64
import hashlib
import os

import httpx2

TOKEN_URL = "https://api-users.fishial.ai/v1/auth/token"
UPLOAD_URL = "https://api.fishial.ai/v1/recognition/upload"
RECOGNIZE_URL = "https://api.fishial.ai/v1/recognition/image"

# A slow reply can't hang the request.
TIMEOUT_SECONDS = 15

# Fishial gives each possible species an accuracy from 0 to 1. Below this, the
# app says the fish couldn't be identified instead of guessing (6.1 AC4).
MIN_ACCURACY = 0.6


class FishialError(Exception):
    """Fishial couldn't be reached or sent back something unusable."""


def make_client():
    # Fishial's upload step fails with a server error unless the request asks
    # for JSON back, as Fishial's own example code does.
    return httpx2.Client(timeout=TIMEOUT_SECONDS, headers={"Accept": "application/json"})


def get_token(client):
    response = client.post(TOKEN_URL, json={
        "client_id": os.environ.get("FISHIAL_CLIENT_ID", ""),
        "client_secret": os.environ.get("FISHIAL_CLIENT_SECRET", ""),
    })
    response.raise_for_status()
    return response.json()["access_token"]


def upload_photo(client, token, photo):
    # Fishial checks the upload against the photo's size and MD5 checksum.
    checksum = base64.b64encode(hashlib.md5(photo).digest()).decode()
    response = client.post(
        UPLOAD_URL,
        headers={"Authorization": f"Bearer {token}"},
        json={"blob": {
            "filename": "fish.jpg",
            "content_type": "image/jpeg",
            "byte_size": len(photo),
            "checksum": checksum,
        }},
    )
    response.raise_for_status()
    upload = response.json()

    # The photo goes straight to the storage link Fishial returned, with only the
    # headers it gave. Content-Type must be empty, as Fishial's docs say.
    direct = upload["direct-upload"]
    put = client.put(direct["url"], content=photo, headers={**direct["headers"], "Content-Type": ""})
    put.raise_for_status()
    return upload["signed-id"]


def recognize(client, token, signed_id):
    response = client.get(RECOGNIZE_URL, params={"q": signed_id}, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    return response.json()


def best_match(recognition):
    """Returns (scientific name, accuracy) of the most likely species, or None."""
    candidates = [
        (species["name"], float(species["accuracy"]))
        for fish in recognition.get("results", [])
        for species in fish.get("species", [])
    ]
    return max(candidates, key=lambda candidate: candidate[1], default=None)


def identify_photo(photo, client=None):
    """Identifies the fish in a JPEG photo (bytes).

    Returns {"identified": True, "scientificName": ..., "accuracy": ...},
    {"identified": False} when no fish is found or Fishial isn't sure enough,
    or raises FishialError when Fishial fails, so the caller can fall back.
    """
    try:
        client = client or make_client()
        token = get_token(client)
        signed_id = upload_photo(client, token, photo)
        match = best_match(recognize(client, token, signed_id))
    except (httpx2.HTTPError, KeyError, TypeError, ValueError) as error:
        raise FishialError(str(error)) from error

    if not match or match[1] < MIN_ACCURACY:
        return {"identified": False}
    return {"identified": True, "scientificName": match[0], "accuracy": round(match[1], 2)}
