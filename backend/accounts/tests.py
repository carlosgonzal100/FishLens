# Backend tests for the acceptance criteria in spec.md that the accounts API handles.
# Each test sends a request to the real endpoint and checks the response and the database.
# Django creates a temporary test database and deletes it afterward.
import json

from django.test import TestCase

from .models import Account

REGISTER_URL = "/api/accounts/register/"
SIGN_IN_URL = "/api/accounts/sign-in/"
ME_URL = "/api/accounts/me/"

VALID_ACCOUNT = {
    "firstName": "Alex",
    "lastName": "Rivera",
    "email": "angler@example.com",
    "username": "fishfan2024",
    "password": "Fish!2024",
}


class AccountsTestCase(TestCase):
    def post(self, url, body):
        return self.client.post(url, data=json.dumps(body), content_type="application/json")

    def register(self, **changes):
        return self.post(REGISTER_URL, {**VALID_ACCOUNT, **changes})

    def assert_rejected(self, response, field, requirement):
        self.assertEqual(response.status_code, 400)
        self.assertIn(requirement, response.json()["errors"][field])
        self.assertEqual(Account.objects.count(), 0)


class RegisterTests(AccountsTestCase):
    """User Story 1.2 - Register an Account"""

    def test_ac1_valid_unused_details_create_the_account(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        account = Account.objects.get()
        self.assertEqual(account.first_name, "Alex")
        self.assertEqual(account.last_name, "Rivera")
        self.assertEqual(account.email, "angler@example.com")
        self.assertEqual(account.username, "fishfan2024")

    def test_ac2_a_missing_field_is_rejected_and_creates_no_account(self):
        for field in VALID_ACCOUNT:
            with self.subTest(field=field):
                response = self.register(**{field: ""})
                self.assert_rejected(response, "form", "required")

    def test_ac3_an_invalid_name_is_rejected_and_creates_no_account(self):
        for name in ["Al", "A" * 21, "Carl0s", "Car!os"]:
            with self.subTest(name=name):
                self.assert_rejected(self.register(firstName=name), "firstName", "3 to 20 letters")
                self.assert_rejected(self.register(lastName=name), "lastName", "3 to 20 letters")

        # The limits themselves (3 and 20 letters) are allowed.
        response = self.register(firstName="Abe", lastName="A" * 20)
        self.assertEqual(response.status_code, 201)

    def test_ac4_an_invalid_email_is_rejected_and_creates_no_account(self):
        for email in ["angler", "angler@", "angler@example", "@example.com"]:
            with self.subTest(email=email):
                self.assert_rejected(self.register(email=email), "email", "valid format")

    def test_ac5_a_username_outside_8_to_16_characters_is_rejected(self):
        for username in ["a" * 7, "a" * 17]:
            with self.subTest(username=username):
                self.assert_rejected(self.register(username=username), "username", "between 8 and 16")

        # The limits themselves (8 and 16 characters) are allowed.
        self.assertEqual(self.register(username="a" * 8).status_code, 201)
        response = self.register(username="b" * 16, email="second@example.com")
        self.assertEqual(response.status_code, 201)

    def test_ac6_an_invalid_password_is_rejected_and_creates_no_account(self):
        invalid_passwords = [
            "Fish!12",  # only 7 characters
            "12345!678",  # no letter
            "Fishing!!",  # no number
            "Fishing12",  # no special character
        ]
        for password in invalid_passwords:
            with self.subTest(password=password):
                self.assert_rejected(self.register(password=password), "password", "at least 8 characters")

        # The limit itself (exactly 8 characters) is allowed.
        self.assertEqual(self.register(password="Fish!123").status_code, 201)

    def test_ac7_a_username_or_email_already_in_use_is_rejected(self):
        self.register()

        # Same username, different email. Capital letters must not get around the check.
        response = self.register(email="other@example.com", username="FISHFAN2024")
        self.assertEqual(response.status_code, 409)
        self.assertIn("already in use", response.json()["errors"]["form"])
        self.assertEqual(Account.objects.count(), 1)

        # Same email, different username.
        response = self.register(email="ANGLER@EXAMPLE.COM", username="otherangler")
        self.assertEqual(response.status_code, 409)
        self.assertIn("already in use", response.json()["errors"]["form"])
        self.assertEqual(Account.objects.count(), 1)


class SignInTests(AccountsTestCase):
    """User Story 1.3 - Sign In"""

    def setUp(self):
        self.register()

    def test_ac1_the_correct_username_and_password_sign_the_user_in(self):
        response = self.post(SIGN_IN_URL, {"username": "fishfan2024", "password": "Fish!2024"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["account"]["username"], "fishfan2024")

    def test_ac2_a_wrong_username_or_password_shows_the_exact_message_and_allows_retry(self):
        attempts = [
            {"username": "fishfan2024", "password": "Wrong!2024"},
            {"username": "notauser2024", "password": "Fish!2024"},
        ]
        for attempt in attempts:
            with self.subTest(attempt=attempt):
                response = self.post(SIGN_IN_URL, attempt)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json()["errors"]["form"], "Incorrect username or password")

        # Trying again with the correct details works.
        response = self.post(SIGN_IN_URL, {"username": "fishfan2024", "password": "Fish!2024"})
        self.assertEqual(response.status_code, 200)


class ProfileTests(AccountsTestCase):
    """User Story 2.1 - View Profile"""

    def test_ac1_a_signed_in_user_gets_their_own_details_and_no_one_else_does(self):
        self.register()
        token = self.post(SIGN_IN_URL, {"username": "fishfan2024", "password": "Fish!2024"}).json()["token"]

        response = self.client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(response.status_code, 200)
        account = response.json()["account"]
        self.assertEqual(account["firstName"], "Alex")
        self.assertEqual(account["lastName"], "Rivera")
        self.assertEqual(account["username"], "fishfan2024")
        self.assertNotIn("password", account)

        for headers in [{}, {"Authorization": "Bearer fishfan2024"}, {"Authorization": f"Bearer {token}x"}]:
            with self.subTest(headers=headers):
                self.assertEqual(self.client.get(ME_URL, headers=headers).status_code, 401)
