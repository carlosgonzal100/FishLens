# Adds the profile picture field (User Story 2.2). Existing accounts start
# with no picture.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="profile_picture",
            field=models.TextField(blank=True, default=""),
        ),
    ]
