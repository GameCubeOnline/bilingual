# Generated by Django 4.1.2 on 2022-10-14 07:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bot', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='channel',
            old_name='reference',
            new_name='hashed_reference',
        ),
        migrations.RenameField(
            model_name='guild',
            old_name='reference',
            new_name='hashed_reference',
        ),
        migrations.RenameField(
            model_name='message',
            old_name='reference',
            new_name='hashed_reference',
        ),
    ]
