"""
ASGI config for HOSYMINH_DH_52201052_STU_PROJECT project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'HOSYMINH_DH_52201052_STU_PROJECT.settings')

application = get_asgi_application()
