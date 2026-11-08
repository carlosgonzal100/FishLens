from django.urls import include, path

urlpatterns = [
    path("api/accounts/", include("accounts.urls")),
]
