from core.repositories.base_repository import BaseRepository
from apps.documents.models import Document, DocumentType


class DocumentRepository(BaseRepository):
    model = Document

    def get_all_documents(self):
        return self.model.objects.all().order_by('-uploaded_at')

    def get_document_by_id(self, doc_id):
        return self.first(id=doc_id)

    def create_document(self, file, type_id=None, description=""):
        return self.create(file=file, document_type_id=type_id, description=description)


class DocumentTypeRepository(BaseRepository):
    model = DocumentType

    def get_all_types(self):
        return self.all()
