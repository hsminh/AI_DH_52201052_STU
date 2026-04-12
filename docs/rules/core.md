# Core Infrastructure Reference

## Overview

The `core/` directory provides shared infrastructure used across all feature apps.
It contains the base classes for repositories and services, management commands, and utilities.

```
core/
├── cache/
│   └── chroma_db_cache/         # ChromaDB persistent store for semantic cache
├── management/
│   ├── mixins.py                # AppResolutionMixin
│   └── commands/
│       └── startapp_scaffold.py # App scaffold generator
├── repositories/
│   └── base_repository.py       # BaseRepository
├── services/
│   └── base_service.py          # BaseService
└── utils/
    └── helpers/
        └── str.py               # String conversion utilities
```

---

## BaseRepository

**Path:** `core/repositories/base_repository.py`

**Purpose:**
Provides a standard set of Django ORM CRUD operations that all app repositories inherit.
Keeps all DB access in one place and out of services/views.
Subclasses set the `model` class attribute and add app-specific query methods.

**Why use it:**
- Avoids repeating `Model.objects.get()`, `.filter()`, `.create()` across every app
- Gives a consistent interface — services always call the same method names
- Makes repositories swappable and testable

**How to use:**

```python
from core.repositories.base_repository import BaseRepository
from apps.accounts.models import Account

class AccountRepository(BaseRepository):
    model = Account

    def get_by_username(self, username):
        """
        Find account by username.
        @param username: Username string to look up
        @return: Account instance or None
        """
        return self.get(username=username)
```

### Method Reference

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get(**kwargs)` | Single instance by filter. Returns `None` if not found. |
| `find` | `find(pk)` | Single instance by primary key (uses `self.pk` attr). |
| `find_by_id` | `find_by_id(id)` | Single instance by integer `id` field. |
| `filter` | `filter(**kwargs)` | QuerySet matching filters. |
| `exclude` | `exclude(**kwargs)` | QuerySet excluding matches. |
| `create` | `create(**kwargs)` | Create and save new instance. |
| `update` | `update(instance, **kwargs)` | Update specific fields on existing instance. |
| `update_or_create` | `update_or_create(defaults, **kwargs)` | Update if exists, create if not. Returns `(instance, created)`. |
| `first_or_create` | `first_or_create(**kwargs)` | Return first match or create new. |
| `delete` | `delete(instance)` | Delete the instance from DB. |
| `all` | `all()` | All instances as QuerySet. |
| `first` | `first(**kwargs)` | First match or `None`. |

**Class Attributes:**

| Attribute | Default | Description |
|-----------|---------|-------------|
| `model` | `None` | Django model class — **must be set** by subclass |
| `pk` | `'pk'` | Primary key field name used by `find()` |

---

## BaseService

**Path:** `core/services/base_service.py`

**Purpose:**
Provides the same interface as `BaseRepository` but acts as the business logic layer.
Services inherit from `BaseService` and inject a repository in `__init__`.
Business rules, validations, and transactions are added by overriding methods.

**Why use it:**
- Views only talk to services — never to repositories directly
- Centralises business logic in one place
- Standard method names across all services make code predictable

**How to use:**

```python
from django.db import transaction
from core.services.base_service import BaseService
from apps.accounts.repositories import AccountRepository

class AccountService(BaseService):
    def __init__(self):
        self.repository = AccountRepository()

    def register_consumer(self, username, password, email, profile_data):
        """
        Register a new consumer account with profile in a single transaction.
        @param username: Unique username
        @param password: Plain text password (hashed internally)
        @param email: User email
        @param profile_data: Dict with weight, height, age, gender, etc.
        @return: Newly created Account instance
        """
        with transaction.atomic():
            user = self.repository.create_account(username, password, email, role='CONSUMER')
            self.repository.create_profile(user, **profile_data)
            return user
```

### Method Reference

All methods delegate directly to `self.repository`. Override any to add logic.

| Method | Delegates to |
|--------|-------------|
| `get(**kwargs)` | `repository.get()` |
| `find(pk)` | `repository.find()` |
| `find_by_id(id)` | `repository.find_by_id()` |
| `filter(**kwargs)` | `repository.filter()` |
| `create(**kwargs)` | `repository.create()` |
| `update(instance, **kwargs)` | `repository.update()` |
| `update_or_create(defaults, **kwargs)` | `repository.update_or_create()` |
| `first_or_create(**kwargs)` | `repository.first_or_create()` |
| `delete(instance)` | `repository.delete()` |
| `all()` | `repository.all()` |
| `first(**kwargs)` | `repository.first()` |

---

## Relationship Between Layers

```
View
 └─► Service (inherits BaseService)
       └─► Repository (inherits BaseRepository)
             └─► Django Model (ORM)
```

- **View** → instantiates service, calls service methods, handles HTTP
- **Service** → holds business logic, instantiates repository in `__init__`
- **Repository** → holds all DB queries, extends BaseRepository with app-specific methods
- **Model** → pure data definition, no logic

**Example — full chain:**

```python
# View
class RegisterView(generics.CreateAPIView):
    def post(self, request):
        service = AccountService()
        user = service.register_consumer(**request.data)
        return Response(AccountSerializer(user).data)

# Service
class AccountService(BaseService):
    def __init__(self):
        self.repository = AccountRepository()

    def register_consumer(self, username, password, email, profile_data):
        with transaction.atomic():
            user = self.repository.create_account(username, password, email)
            self.repository.create_profile(user, **profile_data)
            return user

# Repository
class AccountRepository(BaseRepository):
    model = Account

    def create_account(self, username, password, email, role='CONSUMER'):
        return Account.objects.create_user(username=username, password=password, email=email, role=role)
```

---

## HybridCacheService

**Path:** `apps/fitness/services/cache_service.py`

**Purpose:**
Two-layer cache for AI analysis results to avoid repeated LLM calls for the same food.

| Layer | Type | Key | Threshold |
|-------|------|-----|-----------|
| Layer 1 | DB exact match | SHA256(food_name + type + profile_hash) | exact |
| Layer 2 | ChromaDB semantic | food_name embedding | similarity ≥ 0.92 |

**TTL:** text/image = 72h, cooking = 168h

**Store location:** `core/cache/chroma_db_cache/`

---

## AppResolutionMixin

**Path:** `core/management/mixins.py`

**Purpose:**
Used by management commands to resolve Django app configs from both simple (`app_name`) and nested (`master_app.sub_app`) formats.
Used internally by `startapp_scaffold`.

---

## String Utilities

**Path:** `core/utils/helpers/str.py`

| Function | Input | Output | Example |
|----------|-------|--------|---------|
| `to_pascal_case(name)` | `snake_case` | `PascalCase` | `user_profile` → `UserProfile` |
| `to_snake_case(name)` | `PascalCase` | `snake_case` | `UserProfile` → `user_profile` |
| `to_plural_snake_case(name)` | any | plural snake | `user_profile` → `user_profiles` |
