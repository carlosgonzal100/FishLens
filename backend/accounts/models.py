from django.db import models


class Account(models.Model):
    """A registered user, saved in the "accounts" collection."""

    first_name = models.CharField(max_length=20)
    last_name = models.CharField(max_length=20)
    email = models.EmailField(unique=True)  # saved in lowercase
    username = models.CharField(max_length=16, unique=True)  # saved in lowercase
    password = models.CharField(max_length=128)  # a salted hash, never the real password
    # User Story 2.2: a small JPEG saved as a data URL ("data:image/jpeg;base64,...").
    # Empty when the user hasn't set a picture.
    profile_picture = models.TextField(blank=True, default="")

    class Meta:
        db_table = "accounts"

    def __str__(self):
        return self.username
