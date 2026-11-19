from django.http import JsonResponse
from django.views.decorators.http import require_POST

from accounts.views import SIGN_IN_AGAIN, read_json, signed_in_account, text_field

from .fish_chat_service import MAX_QUESTION_CHARS, answer_question


@require_POST
def ask(request):
    """User Story 6.2 - Ask the AI Assistant About Fish"""
    # 6.2 is for signed-in users. This also stops strangers from using the API credits.
    if not signed_in_account(request):
        return JsonResponse(SIGN_IN_AGAIN, status=401)

    data = read_json(request)
    if data is None:
        return JsonResponse({"errors": {"form": "The request must be valid JSON."}}, status=400)

    question = text_field(data, "question")
    if not question:
        return JsonResponse({"errors": {"question": "Please type a question."}}, status=400)
    if len(question) > MAX_QUESTION_CHARS:
        return JsonResponse(
            {"errors": {"question": f"Questions can be at most {MAX_QUESTION_CHARS} characters."}},
            status=400,
        )

    return JsonResponse(answer_question(question))
