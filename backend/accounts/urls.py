from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.register),
    path("sign-in/", views.sign_in),
    path("me/", views.me),
    path("me/name/", views.update_name),
]
