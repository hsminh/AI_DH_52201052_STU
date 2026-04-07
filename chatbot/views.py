import os
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from google import genai
from google.genai import errors as genai_errors
import json
from .models import Document, DocumentType
from .rag_service import process_document, get_relevant_context, delete_document_vectors
from .prompts import get_fitness_analyst_prompt

@csrf_exempt
def delete_document(request, doc_id):
    if request.method == "POST":
        try:
            doc = Document.objects.get(id=doc_id)
            # Remove from ChromaDB
            delete_document_vectors(doc.file.path)
            # Remove physical file
            if os.path.exists(doc.file.path):
                os.remove(doc.file.path)
            # Remove from Django DB
            doc.delete()
            return JsonResponse({"status": "success"})
        except Document.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Document not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "POST required"}, status=405)

def manage_training(request):
    document_types = DocumentType.objects.all()
    documents = Document.objects.all().order_by('-uploaded_at')
    return render(request, "chatbot/manage_training.html", {
        "document_types": document_types,
        "documents": documents
    })

import re

def fitness_analyst(request):
    if request.method == "POST":
        user_input = request.POST.get("user_input", "").strip()
        if not user_input:
            return JsonResponse({"error": "No input provided"}, status=400)
            
        # Use advanced prompt from prompts.py
        prompt = get_fitness_analyst_prompt(user_input)

        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=[{"role": "user", "parts": [{"text": prompt}]}]
            )
            
            raw_text = response.text
            # Try to extract JSON if Gemini wrapped it in markdown code blocks
            json_match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
            if json_match:
                try:
                    analysis_data = json.loads(json_match.group(1))
                    return JsonResponse({"analysis": analysis_data})
                except json.JSONDecodeError:
                    pass
            
            return JsonResponse({"error": "Failed to parse AI response as JSON", "raw": raw_text}, status=500)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return render(request, "chatbot/fitness_analyst.html")

@csrf_exempt
def create_document_type(request):
    if request.method == "POST":
        data = json.loads(request.body)
        name = data.get("name")
        description = data.get("description", "")
        if name:
            DocumentType.objects.create(name=name, description=description)
            return JsonResponse({"status": "success"})
    return JsonResponse({"status": "error", "message": "Invalid request"}, status=400)

def chatbot_page(request):
    if "chat_history" not in request.session:
        request.session["chat_history"] = []
    documents = Document.objects.all().order_by('-uploaded_at')
    document_types = DocumentType.objects.all()
    return render(request, "chatbot/chat.html", {
        "chat_history": request.session["chat_history"],
        "documents": documents,
        "document_types": document_types
    })

@csrf_exempt
def upload_document(request):
    if request.method == "POST" and request.FILES.get('file'):
        file = request.FILES['file']
        type_id = request.POST.get('type_id')
        
        doc_type = None
        if type_id:
            try:
                doc_type = DocumentType.objects.get(id=type_id)
            except DocumentType.DoesNotExist:
                pass
                
        doc = Document.objects.create(file=file, document_type=doc_type)
        
        # Process document for RAG
        try:
            process_document(doc.file.path, type_id=type_id)
            return JsonResponse({"status": "success", "filename": file.name, "type": doc_type.name if doc_type else "None"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "No file uploaded"}, status=400)

@csrf_exempt
def send_message(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    data = json.loads(request.body)
    user_message = data.get("message", "").strip()
    type_id = data.get("type_id") # Filter by document type from UI
    
    if not user_message:
        return JsonResponse({"error": "Empty message"}, status=400)

    if "chat_history" not in request.session:
        request.session["chat_history"] = []

    # RAG: Get relevant context with filter
    context = get_relevant_context(user_message, type_id=type_id)
    
    # Construct prompt with context
    if context:
        prompt = f"Context from uploaded documents:\n{context}\n\nUser Question: {user_message}\n\nPlease answer based on the context provided above. If the context doesn't contain relevant information, you can use your general knowledge but mention that it's not from the documents."
    else:
        prompt = user_message

    # Build contents list from history + new prompt
    contents = []
    for entry in request.session["chat_history"]:
        contents.append({"role": entry["role"], "parts": [{"text": entry["text"]}]})
    
    # We send the prompt with context but save only the user's original message in history
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    try:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        MODEL = "gemini-3-flash-preview"

        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
        )
        bot_reply = response.text
    except genai_errors.ClientError as e:
        msg = str(e)
        if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
            return JsonResponse({"reply": "Rate limit reached. Please wait a moment and try again."})
        return JsonResponse({"reply": f"API Client error: {msg}"})
    except genai_errors.ServerError as e:
        return JsonResponse({"reply": "Google Gemini server is currently busy or unavailable. Please wait a few seconds and try again."})
    except Exception as e:
        return JsonResponse({"reply": f"Unexpected error: {str(e)}"})

    # Save to session
    history = request.session["chat_history"]
    history.append({"role": "user", "text": user_message})
    history.append({"role": "model", "text": bot_reply})
    request.session["chat_history"] = history
    request.session.modified = True

    return JsonResponse({"reply": bot_reply})


def clear_chat(request):
    request.session["chat_history"] = []
    request.session.modified = True
    return JsonResponse({"status": "cleared"})
