from django.urls import path

from . import views

urlpatterns = [
    path("", views.species_list),
    path("<slug:slug>/", views.species_detail),
]
