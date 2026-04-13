from core.services.base_service import BaseService
from apps.chatbot_core.services import RAGService
from apps.documents.repositories import DocumentRepository, DocumentTypeRepository


class DocumentService(BaseService):
    def __init__(self):
        self.repository = DocumentRepository()
        self.type_repository = DocumentTypeRepository()

    def upload_and_process(self, file, type_id=None, description=""):
        doc = self.repository.create_document(file, type_id, description)
        type_name = doc.document_type.name if doc.document_type else None
        
        # Check if file is an image
        file_path = doc.file.path
        is_image = any(file_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'])
        
        if is_image:
            RAGService.process_image(file_path, type_name=type_name, description=description)
        else:
            RAGService.process_document(file_path, type_name=type_name)
            
        return doc

    def get_all_documents(self):
        return self.repository.get_all_documents()

    def get_document_by_id(self, doc_id):
        return self.repository.get_document_by_id(doc_id)

    def get_all_types(self):
        return self.type_repository.get_all_types()
