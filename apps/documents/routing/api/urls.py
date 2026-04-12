from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.documents.views.api import DocumentViewSet, DocumentTypeViewSet

router = DefaultRouter()
router.register(r'types', DocumentTypeViewSet)
router.register(r'', DocumentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
