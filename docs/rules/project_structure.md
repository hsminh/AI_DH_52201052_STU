# Project Structure — HOSYMINH_DH_52201052_STU_PROJECT

## Root Layout

```
HOSYMINH_DH_52201052_STU_PROJECT/   # Django project root
│
├── manage.py                        # Django CLI utility
├── .env                             # Environment variables (not committed)
├── db.sqlite3                       # SQLite database (dev)
│
├── HOSYMINH_DH_52201052_STU_PROJECT/  # Django settings package
│   ├── settings.py                  # Main settings
│   ├── urls.py                      # Root URL config
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/                            # Feature applications
│   ├── accounts/                    # Auth & user management
│   ├── chatbot_core/                # RAG + LLM chat services
│   ├── documents/                   # Document upload & management
│   └── fitness/                     # Fitness analysis + AI pipeline
│
├── core/                            # Shared infrastructure
│   ├── cache/
│   │   └── chroma_db_cache/         # ChromaDB vector cache (semantic layer)
│   ├── management/
│   │   ├── mixins.py                # AppResolutionMixin for management commands
│   │   └── commands/
│   │       └── startapp_scaffold.py # Scaffold generator command
│   ├── repositories/
│   │   └── base_repository.py       # BaseRepository — standard Django ORM CRUD
│   ├── services/
│   │   └── base_service.py          # BaseService — delegates to BaseRepository
│   └── utils/
│       └── helpers/
│           └── str.py               # String utilities (pascal_case, snake_case, plural)
│
├── chroma_db/                       # ChromaDB RAG document store
│
├── templates/
│   └── scaffold/
│       └── dummy/                   # Scaffold template for new apps
│
├── docs/
│   └── rules/
│       ├── instruction.md           # Code generation instructions
│       ├── project_structure.md     # This file
│       ├── scaffold.md              # Scaffold command usage
│       └── core.md                  # BaseRepository & BaseService reference
│
└── frontend/                        # Next.js frontend application
    └── src/
        ├── app/                     # Next.js App Router pages
        ├── modules/                 # Feature modules (api + hooks + types)
        ├── components/ui/           # Reusable UI components
        └── shared/                  # Shared API base and types
```

---

## App Structures

### `apps/accounts/` — Auth & User Management

```
accounts/
├── models/
│   └── account.py          # Account (AbstractUser), ConsumerProfile
├── repositories/
│   └── account_repository.py   # AccountRepository, ConsumerProfileRepository
├── serializers/
│   └── account_serializer.py   # AccountSerializer, UserProfileSerializer, ConsumerProfileSerializer
├── services/
│   └── account_service.py      # AccountService — register, profile helpers
├── views/api/
│   └── account_view.py         # RegisterView, ProfileView, UserLoginView, ConsumerLoginView
├── routing/api/
│   └── urls.py                 # /register/, /user/login/, /consumer/login/, /profile/
└── migrations/
```

**Key Models:**
- `Account` — extends `AbstractUser`, adds `role` field (`USER` | `CONSUMER`)
- `ConsumerProfile` — OneToOne with Account, stores fitness profile (weight, height, age…)

---

### `apps/chatbot_core/` — RAG & LLM Chat

```
chatbot_core/
├── data/
│   └── prompts.py              # COOKING_ASSISTANT_SYSTEM_PROMPT, get_cooking_assistant_prompt(), get_meal_tracking_prompt()
├── services/
│   └── rag_service.py          # OmniRouteEmbeddings, RAGService (process_document, get_relevant_context)
├── views/api/
│   └── chat_view.py            # ChatView, ClearChatView, CookingAssistantView
└── routing/api/
    └── urls.py                 # /chat/, /clear/, /cooking/
```

**Key Services:**
- `OmniRouteEmbeddings` — custom LangChain embeddings via OmniRoute API
- `RAGService` — document ingestion (PDF/text) + ChromaDB similarity search

---

### `apps/documents/` — Document Management

```
documents/
├── models/
│   └── document.py             # Document, DocumentType
├── repositories/
│   └── document_repository.py  # DocumentRepository, DocumentTypeRepository
├── serializers/
│   └── document_serializer.py  # DocumentSerializer, DocumentTypeSerializer
├── services/
│   └── document_service.py     # DocumentService — upload + RAG processing
├── views/api/
│   └── document_view.py        # DocumentViewSet, DocumentTypeViewSet (IsUserAdmin permission)
└── routing/api/
    └── urls.py                 # /types/, /  (DRF router)
```

---

### `apps/fitness/` — Fitness Analysis + AI Pipeline

```
fitness/
├── models/
│   └── analysis_cache.py       # AnalysisCache — stores AI analysis results (DB cache layer)
├── services/
│   ├── fitness_service.py      # FitnessService.calculate_metrics() — BMI, BMR, TDEE
│   ├── cache_service.py        # HybridCacheService — Layer 1: DB exact, Layer 2: ChromaDB semantic
│   └── pipeline.py             # identify_food_from_text/image, stream_and_collect, make_cache_key
├── views/api/
│   └── fitness_view.py         # TextAnalysisView, ImageAnalysisView, CookingAssistantView, CacheStatsView
└── routing/api/
    └── urls.py                 # /analyze-text/, /analyze-image/, /cooking-recipe/, /cache/stats/
```

**Key Models:**
- `AnalysisCache` — caches LLM responses keyed by SHA256(food_name + type + profile_hash), with hit counter

**Key Services:**
- `FitnessService.calculate_metrics()` — pure calculation, no DB
- `HybridCacheService` — two-layer cache (DB exact match + ChromaDB semantic match at 0.92 threshold)
- `pipeline.py` — 3-step pipeline: identify food → cache lookup → RAG + LLM stream

---

## Core Infrastructure

### `core/repositories/base_repository.py` — BaseRepository

Standard Django ORM CRUD abstraction. All app repositories inherit from this.
See `docs/rules/core.md` for full reference.

### `core/services/base_service.py` — BaseService

Delegates all CRUD to the injected repository. All app services inherit from this.
See `docs/rules/core.md` for full reference.

### `core/cache/chroma_db_cache/` — Vector Cache Store

ChromaDB persistent store used by `HybridCacheService` for semantic similarity cache lookups.

### `core/management/commands/startapp_scaffold.py` — Scaffold Generator

Generates a new Django app following the standard structure from `templates/scaffold/dummy/`.

```bash
python manage.py startapp_scaffold <app_name>
python manage.py startapp_scaffold <master_app>.<sub_app>
```

---

## URL Map

| URL Prefix | App | File |
|------------|-----|------|
| `/api/accounts/` | accounts | `routing/api/urls.py` |
| `/api/documents/` | documents | `routing/api/urls.py` |
| `/api/fitness/` | fitness | `routing/api/urls.py` |
| `/api/chatbot/` | chatbot_core | `routing/api/urls.py` |
| `/consumer/api/accounts/` | accounts | same |
| `/consumer/api/chatbot/` | chatbot_core | same |
| `/user/api/accounts/` | accounts | same |
| `/admin/` | Django admin | built-in |

---

## Data Flow

```
Request
  └─► View (views/api/)
        └─► Service (services/)          ← business logic, transactions
              └─► Repository (repositories/)  ← DB queries only
                    └─► Django ORM / Model
```

For AI features:
```
Request
  └─► View
        ├─► HybridCacheService.get_exact()     ← Layer 1: DB lookup
        ├─► HybridCacheService.get_semantic()  ← Layer 2: ChromaDB embedding match
        ├─► RAGService.get_relevant_context()  ← Retrieve knowledge base docs
        └─► pipeline.stream_and_collect()      ← Stream LLM response
              └─► HybridCacheService.save()    ← Save result to both cache layers
```
