from django.db import models


class Account(models.Model):
    """A registered user, saved in the "accounts" collection."""

    first_name = models.CharField(max_length=20)
    last_name = models.CharField(max_length=20)
    email = models.EmailField(unique=True)  # saved in lowercase
    username = models.CharField(max_length=16, unique=True)  # saved in lowercase
    password = models.CharField(max_length=128)  # a salted hash, never the real password

    class Meta:
        db_table = "accounts"

    def __str__(self):
        return self.username
