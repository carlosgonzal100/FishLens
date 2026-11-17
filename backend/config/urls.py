from django.urls import include, path

urlpatterns = [
    path("api/accounts/", include("accounts.urls")),
    path("api/chat/", include("chat.urls")),
]
