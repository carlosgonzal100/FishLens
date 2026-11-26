from django.db import models


class Water(models.TextChoices):
    SALTWATER = "saltwater", "Saltwater"
    FRESHWATER = "freshwater", "Freshwater"


class FishSpecies(models.Model):
    """A Long Island fish species, saved in the "fish_species" collection (User Story 5.1).

    The species come from backend/fish/data/fish_species.json and are loaded with
    `python manage.py load_fish`. A text field left empty means that information
    hasn't been added yet, and the app doesn't show it.
    """

    # A short name used in links, like "striped-bass". It stays the same in every
    # database, unlike the MongoDB id.
    slug = models.SlugField(max_length=60, unique=True)
    common_name = models.CharField(max_length=60, unique=True)
    scientific_name = models.CharField(max_length=80, blank=True, default="")
    # Where Long Island anglers usually catch it.
    water = models.CharField(max_length=10, choices=Water.choices)
    features = models.TextField(blank=True, default="")
    habitat = models.TextField(blank=True, default="")  # the environment it's found in
    best_bait = models.TextField(blank=True, default="")
    # Paths of image files the React app serves from public/fish/, like
    # "/fish/striped-bass.jpg". The pictures themselves aren't stored in MongoDB.
    picture = models.CharField(max_length=200, blank=True, default="")
    more_pictures = models.JSONField(blank=True, default=list)

    class Meta:
        db_table = "fish_species"
        ordering = ["common_name"]  # alphabetical

    def __str__(self):
        return self.common_name
