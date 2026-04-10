import os
import requests
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from django.conf import settings
from langchain_core.embeddings import Embeddings

class OmniRouteEmbeddings(Embeddings):
    def __init__(self, model="mistral/mistral-embed", api_url="http://localhost:20128/v1/embeddings"):
        self.model = model
        self.api_url = api_url
        self.api_key = os.environ.get("OMINIROUTE_API_KEY", "")

    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def embed_documents(self, texts):
        try:
            response = requests.post(
                self.api_url,
                json={"input": texts, "model": self.model},
                headers=self._get_headers(),
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                return [item["embedding"] for item in data["data"]]
            else:
                raise Exception(f"OmniRoute Error ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"Embedding failed: {str(e)}")
            raise

    def embed_query(self, text):
        try:
            response = requests.post(
                self.api_url,
                json={"input": [text], "model": self.model},
                headers=self._get_headers(),
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                raise Exception(f"OmniRoute Error ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"Query embedding failed: {str(e)}")
            raise

class RAGService:
    # Use OmniRouteEmbeddings exclusively with correct embedding model
    _embeddings = OmniRouteEmbeddings()
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
