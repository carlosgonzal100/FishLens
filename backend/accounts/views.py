import json
import re

from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .models import Account

TOKEN_SALT = "fishlens.accounts.session"

# Used when a username doesn't exist, so a wrong username takes about as long
# to check as a wrong password.
UNUSED_PASSWORD_HASH = make_password("not-a-real-account")


def read_json(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def text_field(data, name, strip=True):
    value = data.get(name)
    if not isinstance(value, str):
        return ""
    return value.strip() if strip else value


def public_account(account):
    # The password hash never leaves the server.
    return {
        "firstName": account.first_name,
        "lastName": account.last_name,
        "email": account.email,
        "username": account.username,
    }


# Letters only, from any language: \w without digits and underscores.
VALID_NAME = re.compile(r"[^\W\d_]{3,20}")


def name_errors(first_name, last_name, required=False):
    # User Stories 1.2 and 2.3: a first or last name must be 3 to 20 letters.
    # With required=True, an empty name breaks the rule too.
    errors = {}
    if (first_name or required) and not VALID_NAME.fullmatch(first_name):
        errors["firstName"] = "First name must contain 3 to 20 letters only."
    if (last_name or required) and not VALID_NAME.fullmatch(last_name):
        errors["lastName"] = "Last name must contain 3 to 20 letters only."
    return errors


def registration_errors(first_name, last_name, email, username, password):
    # The same rules as src/screens/RegisterScreen.tsx (User Story 1.2).
    errors = {}

    if not all([first_name, last_name, email, username, password]):
        errors["form"] = "All fields are required."

    errors.update(name_errors(first_name, last_name))

    if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        errors["email"] = "Email must have a valid format."

    if username and not 8 <= len(username) <= 16:
        errors["username"] = "Username must contain between 8 and 16 characters."

    if password:
        has_letter = re.search(r"[^\W\d_]", password)
        has_number = re.search(r"[0-9]", password)
        has_special = re.search(r"[^\w\s]|_", password)
        if len(password) < 8 or not (has_letter and has_number and has_special):
            errors["password"] = (
                "Password must contain at least 8 characters, including one letter, "
                "one number, and one special character."
            )

    return errors


@require_POST
def register(request):
    data = read_json(request)
    if data is None:
        return JsonResponse({"errors": {"form": "The request must be valid JSON."}}, status=400)

    first_name = text_field(data, "firstName")
    last_name = text_field(data, "lastName")
    email = text_field(data, "email").lower()
    username = text_field(data, "username").lower()
    password = text_field(data, "password", strip=False)

    errors = registration_errors(first_name, last_name, email, username, password)
    if errors:
        return JsonResponse({"errors": errors}, status=400)

    in_use = {"errors": {"form": "Username or email is already in use."}}
    if Account.objects.filter(email=email).exists() or Account.objects.filter(username=username).exists():
        return JsonResponse(in_use, status=409)

    try:
        account = Account.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            username=username,
            password=make_password(password),
        )
    except IntegrityError:
        # Someone else registered the same username or email at the same moment.
        return JsonResponse(in_use, status=409)

    return JsonResponse({"account": public_account(account)}, status=201)


@require_POST
def sign_in(request):
    data = read_json(request)
    if data is None:
        return JsonResponse({"errors": {"form": "The request must be valid JSON."}}, status=400)

    username = text_field(data, "username").lower()
    password = text_field(data, "password", strip=False)

    account = Account.objects.filter(username=username).first()
    stored_hash = account.password if account else UNUSED_PASSWORD_HASH
    password_matches = check_password(password, stored_hash)

    # The same message either way, as User Story 1.3 requires.
    if not account or not password_matches:
        return JsonResponse({"errors": {"form": "Incorrect username or password"}}, status=401)

    # The token proves who is signed in on later requests. It is signed with
    # DJANGO_SECRET_KEY, so it can't be faked or changed to another username.
    token = signing.dumps(account.username, salt=TOKEN_SALT)
    return JsonResponse({"account": public_account(account), "token": token})


def signed_in_account(request):
    # Reads the token from the Authorization header. Returns the account it
    # belongs to, or None if the token is missing, changed, or faked.
    header = request.headers.get("Authorization", "")
    try:
        username = signing.loads(header.removeprefix("Bearer "), salt=TOKEN_SALT)
    except signing.BadSignature:
        return None
    return Account.objects.filter(username=username).first()


SIGN_IN_AGAIN = {"errors": {"form": "Please sign in again."}}


@require_GET
def me(request):
    account = signed_in_account(request)
    if not account:
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    return JsonResponse({"account": public_account(account)})


@require_POST
def update_name(request):
    """User Story 2.3 - Edit Profile Information"""
    # The token decides whose name changes, so users can only edit their own.
    account = signed_in_account(request)
    if not account:
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    data = read_json(request)
    if data is None:
        return JsonResponse({"errors": {"form": "The request must be valid JSON."}}, status=400)

    first_name = text_field(data, "firstName")
    last_name = text_field(data, "lastName")

    # AC: a name that breaks the rule is not saved, and the user is told the rule.
    errors = name_errors(first_name, last_name, required=True)
    if errors:
        return JsonResponse({"errors": errors}, status=400)

    # AC: a valid name is saved.
    account.first_name = first_name
    account.last_name = last_name
    account.save(update_fields=["first_name", "last_name"])
    return JsonResponse({"account": public_account(account)})
