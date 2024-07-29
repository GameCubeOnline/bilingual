# Generated by Django 4.1.2 on 2022-10-14 09:42

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bot', '0004_guild_default_language'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='channel',
            name='chat_language',
        ),
        migrations.RemoveField(
            model_name='channel',
            name='forward_channels',
        ),
        migrations.RemoveField(
            model_name='channel',
            name='translate_to_languages',
        ),
        migrations.RemoveField(
            model_name='guild',
            name='default_language',
        ),
        migrations.RemoveField(
            model_name='message',
            name='translate_to_messages',
        ),
        migrations.AddField(
            model_name='channel',
            name='data',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='guild',
            name='data',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='message',
            name='data',
            field=models.TextField(blank=True, null=True),
        ),
    ]
