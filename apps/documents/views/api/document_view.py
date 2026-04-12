from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.documents.models import Document, DocumentType
from apps.documents.serializers import DocumentSerializer, DocumentTypeSerializer
from apps.documents.services import DocumentService


class IsUserAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'USER')


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [IsUserAdmin]


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsUserAdmin]

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        type_id = request.data.get('document_type')
        description = request.data.get('description', '')

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doc = DocumentService().upload_and_process(file, type_id=type_id, description=description)
            serializer = self.get_serializer(doc)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
