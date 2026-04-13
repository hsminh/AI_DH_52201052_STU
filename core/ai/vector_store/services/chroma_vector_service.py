import chromadb
import os
from django.conf import settings

class ChromaVectorService:
    def __init__(self, collection_name="local_multimodal_store"):
        """
        Initialize the Chroma Vector Service.
        Chroma is an open-source vector database that runs locally.
        """
        self.persist_directory = os.path.join(settings.BASE_DIR, "chroma_db")
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"} # Using cosine similarity for CLIP embeddings
        )

    def add_vector(self, vector, metadata=None, id=None):
        """
        Add a vector to the collection.
        @param vector: The embedding vector
        @param metadata: Dictionary of metadata
        @param id: Unique ID for the vector
        """
        self.collection.add(
            embeddings=[vector],
            metadatas=[metadata] if metadata else None,
            ids=[id] if id else None
        )

    def query(self, query_vector, n_results=5, where=None):
        """
        Query the collection for similar vectors.
        @param query_vector: The embedding vector to search with
        @param n_results: Number of results to return
        @param where: Optional metadata filter
        """
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=n_results,
            where=where,
            include=["metadatas", "distances", "documents"]
        )
        # Add score calculation (1 / (1 + distance)) for ranking
        processed_results = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                dist = results['distances'][0][i]
                processed_results.append({
                    "id": results['ids'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": dist,
                    "score": 1 / (1 + dist)
                })
        return processed_results
