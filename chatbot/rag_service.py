import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from django.conf import settings

# Initialize Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=os.environ.get("GEMINI_API_KEY")
)

# Persistence directory for ChromaDB
CHROMA_DB_DIR = os.path.join(settings.BASE_DIR, "chroma_db")

def process_document(file_path, type_id=None):
    """Loads a document, splits it, and adds to ChromaDB with type_id metadata."""
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
    
    docs = loader.load()
    
    # Add metadata
    if type_id:
        for doc in docs:
            doc.metadata["document_type_id"] = str(type_id)
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    # Store in ChromaDB
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=CHROMA_DB_DIR
    )
    return vectorstore

def delete_document_vectors(file_path):
    """Deletes vectors from ChromaDB for a specific document."""
    if not os.path.exists(CHROMA_DB_DIR):
        return
    
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )
    
    # LangChain Chroma loaders usually set "source" in metadata
    vectorstore.delete(where={"source": file_path})

def get_relevant_context(query, k=3, type_id=None):
    """Retrieves relevant chunks from ChromaDB, optionally filtering by type_id."""
    if not os.path.exists(CHROMA_DB_DIR):
        return ""
    
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )
    
    # Filter by document_type_id if provided
    filter_dict = {}
    if type_id:
        filter_dict = {"document_type_id": str(type_id)}
    
    results = vectorstore.similarity_search(query, k=k, filter=filter_dict if filter_dict else None)
    context = "\n\n".join([doc.page_content for doc in results])
    return context
