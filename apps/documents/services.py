from .repositories import DocumentRepository
from apps.chatbot_core.services import RAGService

class DocumentService:
    @staticmethod
    def upload_and_process(file, type_id=None, description=""):
        doc = DocumentRepository.create_document(file, type_id, description)
        RAGService.process_document(doc.file.path, type_id=type_id)
        return doc
