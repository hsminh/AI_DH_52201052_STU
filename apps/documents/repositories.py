from .models import Document, DocumentType

class DocumentRepository:
    @staticmethod
    def get_all_documents():
        return Document.objects.all().order_by('-uploaded_at')

    @staticmethod
    def get_document_by_id(doc_id):
        return Document.objects.filter(id=doc_id).first()

    @staticmethod
    def get_all_types():
        return DocumentType.objects.all()

    @staticmethod
    def create_document(file, type_id=None, description=""):
        return Document.objects.create(file=file, document_type_id=type_id, description=description)
