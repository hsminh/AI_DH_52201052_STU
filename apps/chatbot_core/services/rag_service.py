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


from core.ai.embeddings.services.multimodal_embedding_service import MultimodalEmbeddingService

class RAGService:
    _embeddings = OmniRouteEmbeddings()
    _multimodal_embeddings = MultimodalEmbeddingService()
    _chroma_db_dir = os.path.join(settings.BASE_DIR, "chroma_db")

    @classmethod
    def get_image_context(cls, image_path, k=3, type_name=None, content_type="image/png"):
        if not os.path.exists(cls._chroma_db_dir):
            return ""

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings # LangChain Chroma expects this, but we will pass query vector directly
        )

        # Get multimodal embedding for the image
        try:
            query_vector = cls._multimodal_embeddings.get_image_embedding(image_path, content_type=content_type)
        except Exception as e:
            print(f"[RAG] Failed to get image embedding: {e}")
            return ""

        filter_dict = {}
        if type_name:
            filter_dict = {"document_type": str(type_name)}

        # Perform similarity search using the image vector
        results = vectorstore.similarity_search_by_vector(query_vector, k=k, filter=filter_dict if filter_dict else None)
        context = "\n\n".join([doc.page_content for doc in results])
        return context

    @classmethod
    def process_image(cls, image_path, type_name=None, description="", content_type="image/png"):
        if not os.path.exists(cls._chroma_db_dir):
            os.makedirs(cls._chroma_db_dir)

        # Get multimodal embedding for the image
        # If we already have a description, we just embed that description directly
        # to save time and avoid re-running vision model.
        try:
            if description:
                image_vector = cls._multimodal_embeddings.get_text_embedding(description)
            else:
                image_vector = cls._multimodal_embeddings.get_image_embedding(image_path, content_type=content_type)
        except Exception as e:
            print(f"[RAG] Failed to process image: {e}")
            return None

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )

        metadata = {"source": image_path, "description": description}
        if type_name:
            metadata["document_type"] = str(type_name)

        # Add image to vector store
        vectorstore.add_texts(
            texts=[description or f"Image: {os.path.basename(image_path)}"],
            embeddings=[image_vector],
            metadatas=[metadata],
            ids=[f"img_{os.path.basename(image_path)}_{os.getpid()}"]
        )
        return vectorstore

    @classmethod
    def process_document(cls, file_path, type_name=None):
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)

        docs = loader.load()
        if type_name:
            for doc in docs:
                doc.metadata["document_type"] = str(type_name)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=cls._embeddings,
            persist_directory=cls._chroma_db_dir
        )
        return vectorstore

    @classmethod
    def get_relevant_context(cls, query, k=3, type_name=None):
        if not os.path.exists(cls._chroma_db_dir):
            return ""

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )

        filter_dict = {}
        if type_name:
            filter_dict = {"document_type": str(type_name)}

        results = vectorstore.similarity_search(query, k=k, filter=filter_dict if filter_dict else None)
        context = "\n\n".join([doc.page_content for doc in results])
        return context
