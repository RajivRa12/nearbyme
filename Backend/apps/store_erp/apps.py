from django.apps import AppConfig
class StoreErpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.store_erp'
    def ready(self):
        from . import signals  # noqa: F401
