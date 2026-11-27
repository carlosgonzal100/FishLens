from django.urls import path

from . import views

urlpatterns = [
    path("", views.species_list),
    path("identify/", views.identify),  # before <slug> so it isn't read as a fish name
    path("<slug:slug>/", views.species_detail),
]
