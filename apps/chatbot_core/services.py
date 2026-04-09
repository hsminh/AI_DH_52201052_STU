import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from django.conf import settings

class RAGService:
    _embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        google_api_key=os.environ.get("GEMINI_API_KEY")
    )
    _chroma_db_dir = os.path.join(settings.BASE_DIR, "chroma_db")

    @classmethod
    def process_document(cls, file_path, type_id=None):
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)
        
        docs = loader.load()
        if type_id:
            for doc in docs:
                doc.metadata["document_type_id"] = str(type_id)
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=cls._embeddings,
            persist_directory=cls._chroma_db_dir
        )
        return vectorstore

    @classmethod
    def get_relevant_context(cls, query, k=3, type_id=None):
        if not os.path.exists(cls._chroma_db_dir):
            return ""
        
        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )
        
        filter_dict = {}
        if type_id:
            filter_dict = {"document_type_id": str(type_id)}
        
        results = vectorstore.similarity_search(query, k=k, filter=filter_dict if filter_dict else None)
        context = "\n\n".join([doc.page_content for doc in results])
        return context
