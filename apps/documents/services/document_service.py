from core.services.base_service import BaseService
from apps.chatbot_core.services import RAGService
from apps.documents.repositories import DocumentRepository, DocumentTypeRepository


class DocumentService(BaseService):
    def __init__(self):
        self.repository = DocumentRepository()
        self.type_repository = DocumentTypeRepository()

    def upload_and_process(self, file, type_id=None, description=""):
        doc = self.repository.create_document(file, type_id, description)
        RAGService.process_document(doc.file.path, type_id=type_id)
        return doc

    def get_all_documents(self):
        return self.repository.get_all_documents()

    def get_document_by_id(self, doc_id):
        return self.repository.get_document_by_id(doc_id)

    def get_all_types(self):
        return self.type_repository.get_all_types()
