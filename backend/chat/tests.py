# Backend tests for User Story 6.2 and its fallback path.
# Claude is never really called: the real Anthropic library talks to a fake
# network (a mocked transport), so the tests are free and give the same result
# every time. Whether Claude's real answers are good is checked by the eval suite.
import json
import os
from unittest import mock

import anthropic
import httpx2
from django.core import signing
from django.test import TestCase

from accounts.models import Account
from accounts.views import TOKEN_SALT

from . import fish_chat_service
from .fish_chat_service import FALLBACK_ANSWER, MAX_QUESTION_CHARS, PROMPTS_DIR

ASK_URL = "/api/chat/ask/"


def claude_reply(text, stop_reason="end_turn"):
    # The shape of a real Messages API response.
    return httpx2.Response(200, json={
        "id": "msg_test",
        "type": "message",
        "role": "assistant",
        "model": "test-model",
        "content": [{"type": "text", "text": text}],
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 10, "output_tokens": 10},
    })


def claude_error(status, error_type):
    return httpx2.Response(status, json={"type": "error", "error": {"type": error_type, "message": "test"}})


class ChatTestCase(TestCase):
    def setUp(self):
        # Settings the service reads, set for each test only.
        settings = mock.patch.dict(os.environ, {"LLM_MODEL": "test-model", "FISH_CHAT_PROMPT_VERSION": "v1"})
        settings.start()
        self.addCleanup(settings.stop)

        Account.objects.create(
            first_name="Alex",
            last_name="Rivera",
            email="angler@example.com",
            username="fishfan2024",
            password="not-used-in-these-tests",
        )
        self.token = signing.dumps("fishfan2024", salt=TOKEN_SALT)

        self.sent = []  # every request the fake Claude received
        self.fake_claude(claude_reply("Fluke are found on sandy bottoms in the South Shore bays."))

    def fake_claude(self, reply):
        """Makes the service use a fake Claude that answers with reply.

        reply is a response, or an exception to raise as if the network failed.
        """
        def handle(request):
            self.sent.append(json.loads(request.content))
            if isinstance(reply, Exception):
                raise reply
            return reply

        # max_retries=0 so failures reach the fallback at once instead of waiting.
        client = anthropic.Anthropic(
            api_key="test-key",
            max_retries=0,
            http_client=httpx2.Client(transport=httpx2.MockTransport(handle)),
        )
        patcher = mock.patch.object(fish_chat_service, "make_client", return_value=client)
        patcher.start()
        self.addCleanup(patcher.stop)

    def ask(self, question, token=None, body=None):
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token or self.token}"}
        data = body if body is not None else json.dumps({"question": question})
        return self.client.post(ASK_URL, data=data, content_type="application/json", **headers)

    def assert_answered_by_claude(self, response, answer):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"answer": answer, "source": "llm:v1"})

    def assert_rejected(self, response, status, field, message):
        self.assertEqual(response.status_code, status)
        self.assertIn(message, response.json()["errors"][field])
        self.assertEqual(self.sent, [], "Claude must not be called")


class AskTheAssistantTests(ChatTestCase):
    """User Story 6.2 - Ask the AI Assistant About Fish"""

    def test_ac1_a_question_about_a_fish_species_gets_a_response(self):
        self.fake_claude(claude_reply("Striped bass have dark stripes along their silver sides."))

        response = self.ask("What does a striped bass look like?")

        self.assert_answered_by_claude(response, "Striped bass have dark stripes along their silver sides.")
        request = self.sent[0]
        # The question is sent inside <question> tags, with prompt v1 as the instructions.
        self.assertEqual(request["messages"], [
            {"role": "user", "content": "<question>What does a striped bass look like?</question>"},
        ])
        self.assertEqual(request["system"], (PROMPTS_DIR / "v1.txt").read_text(encoding="utf-8"))
        # The model comes from the LLM_MODEL setting, and no temperature is sent.
        self.assertEqual(request["model"], "test-model")
        self.assertNotIn("temperature", request)

    def test_ac2_a_where_to_catch_question_gets_location_information(self):
        self.fake_claude(claude_reply("Fluke are caught in the South Shore bays and inlets."))

        response = self.ask("Where can I catch fluke on Long Island?")

        self.assert_answered_by_claude(response, "Fluke are caught in the South Shore bays and inlets.")
        self.assertIn("Where can I catch fluke on Long Island?", self.sent[0]["messages"][0]["content"])

    def test_ac3_a_bait_question_gets_bait_information(self):
        self.fake_claude(claude_reply("Porgy bite well on clams and squid."))

        response = self.ask("What bait should I use for porgy?")

        self.assert_answered_by_claude(response, "Porgy bite well on clams and squid.")
        self.assertIn("What bait should I use for porgy?", self.sent[0]["messages"][0]["content"])


class AskRequestTests(ChatTestCase):
    """Who can ask, and which questions are refused before Claude is called."""

    def test_a_user_who_is_not_signed_in_is_refused(self):
        response = self.client.post(ASK_URL, data=json.dumps({"question": "Hi"}), content_type="application/json")
        self.assert_rejected(response, 401, "form", "sign in")

        self.assert_rejected(self.ask("Hi", token="fake-token"), 401, "form", "sign in")

    def test_an_empty_question_is_refused(self):
        for question in ["", "   "]:
            with self.subTest(question=question):
                self.assert_rejected(self.ask(question), 400, "question", "type a question")

    def test_a_question_over_the_limit_is_refused(self):
        too_long = "a" * (MAX_QUESTION_CHARS + 1)
        self.assert_rejected(self.ask(too_long), 400, "question", f"at most {MAX_QUESTION_CHARS} characters")

        # The limit itself is allowed.
        self.assertEqual(self.ask("a" * MAX_QUESTION_CHARS).status_code, 200)

    def test_a_request_that_is_not_json_is_refused(self):
        self.assert_rejected(self.ask(None, body="not json"), 400, "form", "valid JSON")


class FallbackTests(ChatTestCase):
    """When Claude fails or gives an unusable answer, the user gets the fallback message."""

    def assert_fallback(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"answer": FALLBACK_ANSWER, "source": "fallback"})

    def test_api_errors_use_the_fallback(self):
        errors = {
            "rate limited": claude_error(429, "rate_limit_error"),
            "server error": claude_error(500, "api_error"),
            "overloaded": claude_error(529, "overloaded_error"),
            "bad API key": claude_error(401, "authentication_error"),
            "connection lost": httpx2.ConnectError("connection lost"),
            "timed out": httpx2.ReadTimeout("timed out"),
        }
        for name, reply in errors.items():
            with self.subTest(name):
                self.fake_claude(reply)
                self.assert_fallback(self.ask("Where can I catch fluke?"))

    def test_a_cut_off_answer_uses_the_fallback(self):
        self.fake_claude(claude_reply("Fluke are found in", stop_reason="max_tokens"))
        self.assert_fallback(self.ask("Where can I catch fluke?"))

    def test_an_empty_answer_uses_the_fallback(self):
        self.fake_claude(claude_reply("   "))
        self.assert_fallback(self.ask("Where can I catch fluke?"))

    def test_a_missing_model_setting_uses_the_fallback(self):
        del os.environ["LLM_MODEL"]
        self.assert_fallback(self.ask("Where can I catch fluke?"))
        self.assertEqual(self.sent, [], "Claude must not be called")
