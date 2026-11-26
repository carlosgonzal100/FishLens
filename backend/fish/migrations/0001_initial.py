import django_mongodb_backend.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FishSpecies',
            fields=[
                ('id', django_mongodb_backend.fields.ObjectIdAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=60, unique=True)),
                ('common_name', models.CharField(max_length=60, unique=True)),
                ('scientific_name', models.CharField(blank=True, default='', max_length=80)),
                ('water', models.CharField(choices=[('saltwater', 'Saltwater'), ('freshwater', 'Freshwater')], max_length=10)),
                ('features', models.TextField(blank=True, default='')),
                ('habitat', models.TextField(blank=True, default='')),
                ('best_bait', models.TextField(blank=True, default='')),
                ('picture', models.CharField(blank=True, default='', max_length=200)),
                ('more_pictures', models.JSONField(blank=True, default=list)),
            ],
            options={
                'db_table': 'fish_species',
                'ordering': ['common_name'],
            },
        ),
    ]
