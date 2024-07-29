from django.db import models

# Create your models here.

class Guild(models.Model):
    hashed_reference = models.TextField(unique=True)
    data = models.TextField(null=True, blank=True)

    created_date = models.DateTimeField(null=True, blank=True, auto_now_add=True)
    last_seen_date = models.DateTimeField(null=True, blank=True, auto_now=True)

class Channel(models.Model):
    guild = models.ForeignKey(Guild, on_delete=models.CASCADE, null=True, blank=True)
    hashed_reference = models.TextField(unique=True)
    data = models.TextField(null=True, blank=True)

    created_date = models.DateTimeField(null=True, blank=True, auto_now_add=True)
    last_seen_date = models.DateTimeField(null=True, blank=True, auto_now=True)

class Message(models.Model):
    guild = models.ForeignKey(Guild, on_delete=models.CASCADE, null=True, blank=True)
    hashed_reference = models.TextField(unique=True)
    data = models.TextField(null=True, blank=True)

    created_date = models.DateTimeField(null=True, blank=True, auto_now_add=True)
