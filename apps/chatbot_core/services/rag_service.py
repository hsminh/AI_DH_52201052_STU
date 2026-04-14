import os
import requests
import uuid
import csv
import io
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
    def get_image_context(cls, image_path, k=3, type_name=None, content_type="image/png", threshold=0.18):
        if not os.path.exists(cls._chroma_db_dir):
            return "", []

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )

        try:
            query_vector = cls._multimodal_embeddings.get_image_embedding(image_path, content_type=content_type)
        except Exception as e:
            print(f"[RAG] Failed to get image embedding: {e}")
            return "", []

        filter_dict = {}
        if type_name:
            filter_dict = {"document_type": str(type_name)}

        try:
            results = vectorstore._collection.query(
                query_embeddings=[query_vector],
                n_results=k,
                where=filter_dict if filter_dict else None,
                include=["documents", "distances"]
            )
        except Exception as e:
            print(f"[RAG] Collection query failed: {e}")
            return "", []

        valid_results = []
        valid_ids = []
        if results and 'documents' in results and len(results['documents']) > 0:
            docs = results['documents'][0]
            distances = results['distances'][0]
            ids = results.get('ids', [[]])[0]
            for doc_text, dist, doc_id in zip(docs, distances, ids if len(ids) > 0 else [None]*len(docs)):
                if dist <= threshold:
                    valid_results.append(doc_text)
                    if doc_id:
                        valid_ids.append(doc_id)

        if valid_results:
            print(f"[RAG] Found {len(valid_results)} matches within threshold {threshold}")
        else:
            print(f"[RAG] No matches found within threshold {threshold}")

        context = "\n\n".join(valid_results)
        return context, valid_ids

    @classmethod
    def update_image_analysis(cls, image_path=None, correct_description="", type_name=None, content_type="image/png", vector_id=None):
        if not os.path.exists(cls._chroma_db_dir):
            os.makedirs(cls._chroma_db_dir)

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )

        image_vector = None
        if image_path:
            try:
                image_vector = cls._multimodal_embeddings.get_image_embedding(image_path, content_type=content_type)
            except Exception as e:
                print(f"[RAG] Failed to process image for update: {e}")
                if not vector_id:
                    return None

        existing_id = vector_id
        if not existing_id and image_vector:
            filter_dict = {"document_type": str(type_name)} if type_name else None
            results = vectorstore._collection.query(
                query_embeddings=[image_vector],
                n_results=1,
                where=filter_dict,
                include=["distances"]
            )
            if results and 'ids' in results and len(results['ids'][0]) > 0:
                if results['distances'][0][0] < 0.1:
                    existing_id = results['ids'][0][0]
                    print(f"[RAG] Found existing entry {existing_id} by vector.")

        metadata = {"description": correct_description}
        if image_path:
            metadata["source"] = image_path
        if type_name:
            metadata["document_type"] = str(type_name)

        unique_id = existing_id or f"img_{uuid.uuid4().hex}"

        try:
            if image_vector:
                vectorstore._collection.upsert(
                    ids=[unique_id],
                    embeddings=[image_vector],
                    documents=[correct_description],
                    metadatas=[metadata]
                )
            else:
                vectorstore._collection.update(
                    ids=[unique_id],
                    documents=[correct_description],
                    metadatas=[metadata]
                )
        except Exception as e:
            print(f"[RAG] Chroma update/upsert failed: {e}")
            return None

        print(f"[RAG] Updated image analysis for {unique_id}")
        return unique_id

    @classmethod
    def get_all_images(cls, type_name="Recipe"):
        if not os.path.exists(cls._chroma_db_dir):
            return []

        vectorstore = Chroma(
            persist_directory=cls._chroma_db_dir,
            embedding_function=cls._embeddings
        )

        filter_dict = {"document_type": str(type_name)} if type_name else None
        
        data = vectorstore._collection.get(
            where=filter_dict,
            include=["documents", "metadatas"]
        )
        
        results = []
        if data and 'ids' in data:
            for i in range(len(data['ids'])):
                results.append({
                    "id": data['ids'][i],
                    "description": data['documents'][i],
                    "metadata": data['metadatas'][i]
                })
        return results

    @classmethod
    def process_image(cls, image_path, type_name=None, description="", content_type="image/png", vector_id=None):
        if not os.path.exists(cls._chroma_db_dir):
            os.makedirs(cls._chroma_db_dir)

        try:
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

        unique_id = vector_id or f"img_{uuid.uuid4().hex}"

        try:
            vectorstore._collection.upsert(
                ids=[unique_id],
                embeddings=[image_vector],
                documents=[description or f"Image: {os.path.basename(image_path)}"],
                metadatas=[metadata]
            )
        except Exception as e:
            print(f"[RAG] Failed to save/upsert image: {e}")
            return None

        return unique_id

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
