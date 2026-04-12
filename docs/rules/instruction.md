# Code Generation Instructions — STU Project (HOSYMINH_DH_52201052)

## Project Overview

This is a full-stack AI-powered health & fitness assistant application built with Django REST Framework (backend) and Next.js (frontend). The backend follows a layered architecture with strict separation of concerns: Models → Repositories → Services → Views → Routing.

### Runtime Environment
- **Language**: Python 3.13
- **Framework**: Django 6.x, Django REST Framework (DRF)
- **Auth**: SimpleJWT
- **AI / RAG**: LangChain, ChromaDB, OmniRoute LLM proxy
- **Database**: SQLite (dev) — standard Django ORM
- **Frontend**: Next.js (TypeScript), Tailwind CSS, Yarn

---

## Project Principles

### 1. Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Model** | `app/models/` | Django ORM data definition only. No business logic. |
| **Repository** | `app/repositories/` | All DB queries. Inherits `BaseRepository`. No business logic. |
| **Service** | `app/services/` | Business logic, orchestration, transactions. Inherits `BaseService`. Calls repository only. |
| **View** | `app/views/api/` | HTTP request/response handling. Calls service only. No direct DB access. |
| **Serializer** | `app/serializers/` | DRF input validation and output formatting. |
| **Routing** | `app/routing/api/` | URL definitions. Uses DRF Router for ViewSets. |
| **Data** | `app/data/` | Static data: prompts, constants, lookup tables. |

**Rules:**
- Views must never call repositories directly — always go through a service.
- Services must never import from views.
- Repositories must never contain business logic.

---

### 2. Standard App Structure

```
app_name/
├── __init__.py
├── apps.py
├── data/                           # Static data (prompts, constants)
│   ├── __init__.py
│   └── prompts.py
├── models/                         # Django ORM models
│   ├── __init__.py                 # Re-exports all models
│   └── model_name.py
├── repositories/                   # Data access layer
│   ├── __init__.py                 # Re-exports all repositories
│   └── model_repository.py
├── serializers/                    # DRF serializers
│   ├── __init__.py
│   └── model_serializer.py
├── services/                       # Business logic layer
│   ├── __init__.py                 # Re-exports all services
│   └── model_service.py
├── views/                          # API views / ViewSets
│   ├── __init__.py
│   └── api/
│       ├── __init__.py
│       └── model_view.py
├── routing/                        # URL configuration
│   ├── __init__.py
│   └── api/
│       ├── __init__.py
│       └── urls.py
└── migrations/                     # Django migrations
```

---

### 3. Application Registration

Add new apps to `HOSYMINH_DH_52201052_STU_PROJECT/settings.py`:

```python
INSTALLED_APPS = [
    ...
    'apps.your_new_app',
]
```

Register URLs in `HOSYMINH_DH_52201052_STU_PROJECT/urls.py`:

```python
path('api/your_app/', include('apps.your_app.routing.api.urls')),
```

---

## Code Generation Rules

### 1. Models

- Inherit from `django.db.models.Model`
- Keep models thin — data definition and `__str__` only
- Re-export all models from `models/__init__.py`

```python
# models/account.py
from django.db import models

class Account(models.Model):
    username = models.CharField(max_length=150, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
```

```python
# models/__init__.py
from .account import Account
__all__ = ['Account']
```

---

### 2. Repositories

- Inherit from `core.repositories.base_repository.BaseRepository`
- Set `model` class attribute
- Only DB queries here — no business rules
- Naming: `{ModelName}Repository`

```python
# repositories/account_repository.py
from core.repositories.base_repository import BaseRepository
from apps.accounts.models import Account

class AccountRepository(BaseRepository):
    model = Account

    def get_by_username(self, username):
        """
        Find account by username.
        @param username: The account's username string
        @return: Account instance or None
        """
        return self.get(username=username)
```

```python
# repositories/__init__.py
from .account_repository import AccountRepository
__all__ = ['AccountRepository']
```

---

### 3. Services

- Inherit from `core.services.base_service.BaseService`
- Instantiate repository in `__init__`
- All business logic, validations, and transactions go here
- Naming: `{ModelName}Service`

```python
# services/account_service.py
from django.db import transaction
from core.services.base_service import BaseService
from apps.accounts.repositories import AccountRepository

class AccountService(BaseService):
    def __init__(self):
        self.repository = AccountRepository()

    def register(self, username, password, email):
        """
        Register a new account with hashed password.
        @param username: Unique username
        @param password: Plain text password (will be hashed)
        @param email: User email address
        @return: Newly created Account instance
        """
        with transaction.atomic():
            return self.repository.create_account(username, password, email)
```

---

### 4. Serializers

- Naming: `{ModelName}Serializer` for response, `Create{ModelName}RequestSerializer` for input
- Keep validation logic in serializers, not in views

```python
# serializers/account_serializer.py
from rest_framework import serializers
from apps.accounts.models import Account

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'username', 'email']
```

---

### 5. Views (ViewSets / APIView)

- Use DRF `ModelViewSet` or `APIView`
- Instantiate service in `__init__` or as class attribute
- Never access DB directly — always call service
- Permission via `permission_classes`

```python
# views/api/account_view.py
from rest_framework import generics, permissions
from apps.accounts.serializers import AccountSerializer
from apps.accounts.services import AccountService

class RegisterView(generics.CreateAPIView):
    serializer_class = AccountSerializer
    permission_classes = [permissions.AllowAny]
```

---

### 6. Routing

```python
# routing/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.your_app.views.api import YourModelViewSet

router = DefaultRouter()
router.register(r'items', YourModelViewSet, basename='items')

urlpatterns = [
    path('', include(router.urls)),
]
```

---

### 7. Data / Prompts

Static data (LLM prompts, constants, lookup tables) live in `app/data/`:

```python
# data/prompts.py
SYSTEM_PROMPT = "You are a helpful assistant..."

def get_analysis_prompt(user_input: str, metrics: dict) -> str:
    """
    Build the LLM analysis prompt for a given user input and metrics.
    @param user_input: Raw text or food description from the user
    @param metrics: User health metrics dict (bmi, bmr, tdee, etc.)
    @return: Formatted prompt string
    """
    return f"Analyze: {user_input} for user with metrics: {metrics}"
```

---

## Creating a New App

```bash
# From project root
python manage.py startapp_scaffold <app_name>
# For nested app
python manage.py startapp_scaffold <master_app>.<sub_app>
```

Then:
1. Add to `INSTALLED_APPS` in `settings.py`
2. Register URLs in `urls.py`
3. Run `python manage.py makemigrations` if models added
4. Implement: Models → Repository → Service → Serializer → View → Routing

---

## API URL Conventions

| Context | Prefix |
|---------|--------|
| General API | `/api/{app}/` |
| Consumer | `/consumer/api/{app}/` |
| Admin/Space | `/user/api/{app}/` |

---

## Docstring Format

All public methods must have docstrings in this format:

```python
def method_name(self, param1, param2):
    """
    One-line description of what this method does.
    @param param1: Description of param1
    @param param2: Description of param2
    @return: Description of return value
    """
```

---

## Core Utilities Reference

| Module | Path | Purpose |
|--------|------|---------|
| BaseRepository | `core/repositories/base_repository.py` | Standard ORM CRUD for all repositories |
| BaseService | `core/services/base_service.py` | Delegates to repository, base for all services |
| HybridCacheService | `apps/fitness/services/cache_service.py` | Two-layer cache (DB + ChromaDB semantic) |
| RAGService | `apps/chatbot_core/services/rag_service.py` | Document ingestion and vector retrieval |
| Pipeline | `apps/fitness/services/pipeline.py` | Food identification + LLM streaming pipeline |
| str helpers | `core/utils/helpers/str.py` | to_pascal_case, to_snake_case, to_plural_snake_case |
| Scaffold command | `core/management/commands/startapp_scaffold.py` | Generates new app from dummy template |
