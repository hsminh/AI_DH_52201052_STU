# Code Generation Instructions for MyBranding Project

## Project Overview

The project follows a Service-Oriented Architecture (SOA) design approach with clear separation of concerns:
### Repository Model Pattern
- **Model**: Data models representing the business domain
- **Repository Pattern**: Data access layer for database operations
- **Service Layer**: Business logic encapsulation
- **API View Layer**: REST endpoints with proper permission controls
### Multi-tenant Design
- Tenant-specific isolation for data and functionality
- Organization-scoped data access throughout

### Project Runtime Environment
- **Language**: Python
- **Version**: 3.13
- **Framework**: Django 5.2.2, REST Framework (DRF)
- **Build System**: Poetry
- **Package Manager**: Poetry
- **Worker**: Celery
- **Database**: Cassandra Engine / Scylla (primary), with support for other providers


## Project Principles
### 1. Application Structure
The repository is organized into multiple domain-specific modules following a standardized structure:
- Each feature is organized as a Django app (e.g., `accounts`, `commerce`, `crm`, `tenants`)
- **mybranding**: Core application configuration and settings
- **core**: Base functionality and shared utilities
- **accounts**: User authentication and management
- **event**: Tenant's branding event management
- **tenants**: Multi-tenant functionality and organization management
- **crm**: Customer relationship management
- **commerce**: E-commerce and product management
- **rewards**: Loyalty and rewards system
- **pos**: Point of services system
- **payment**: Payment processing integrations
- ...feature-specific apps

### 2. Application Registration Process

- **New applications must be registered** in `mybranding/configs/installed_apps.py` by adding them to the appropriate feature group tuple (e.g., `CORE_APPS`, `TENANT_APPS`, `COMMERCE_APPS`, etc.) or creating a new `{FEATURE}_APPS` tuple if the feature group doesn't exist, then registering it in the final `INSTALLED_APPS` combination

#### For Existing Feature Groups:
Add your new app to the appropriate existing feature group tuple:
```python
# Example: Adding a new commerce app
COMMERCE_APPS = (
    'commerce.products',
    'commerce.new_feature',  # <- Add new app here
)
```

#### For New Feature Groups:
1. Create a new feature group tuple following the naming convention `{FEATURE}_APPS`:
```python
# Example: Creating a new analytics feature group
ANALYTICS_APPS = (
    'analytics',
    'analytics.reports',
    'analytics.dashboards',
)
```

2. Add the new feature group to the final `INSTALLED_APPS` combination:
```python
INSTALLED_APPS += (
    # ... other existing groups ...
    ANALYTICS_APPS # <- Add new feature group here
```

### 3. Standard App Structure
Every app should follow this structure:
```
app_name/
├── __init__.py
├── apps.py                     # Django app configuration
├── enums/                      # Enumerations and constants
│   ├── __init__.py
│   └── app_permissions.py      # Permission definitions
├── models/                     # Data models
│   ├── __init__.py
│   └── model_name.py
├── repositories/               # Data access layer
│   ├── __init__.py
│   └── model_repository.py
├── serializers/                # DRF serializers
│   ├── requests/               # Request serializers
│   ├── __init__.py
│   └── model_serializer.py     # Response serializers
├── services/                   # Business logic layer
│   ├── __init__.py
│   └── model_service.py
├── views/                      # API views
│   └── api/
│       ├── admin/              # Admin-level endpoints
│       ├── space/              # Tenant-scoped endpoints
│       ├── consumer/           # Consumer endpoints
│       ├── community/          # Community endpoints
│       └── __init__.py
├── routing/                    # URL configurations
│   └── api/
│       ├── __init__.py
│       ├── admin_urls.py
│       ├── space_urls.py
│       ├── consumer_urls.py
│       └── community_urls.py
└── locale/                     # Internationalization files
```

## Scaffold Guidelines
For quickly generating new applications, use the scaffold standard template located in `templates/scaffold/dummy/`. 
This scaffold provides a complete template structure for creating new Django applications with standardized patterns.

See the scaffold template documentation for more details on how to use it:
[mcp_scaffold.md](scaffold.md)

## Code Generation Rules

### 1. Models
- **Base Classes**: All models should inherit from `BaseTimeStampedModel` from `core.db.models`
- **Primary Keys**: Use UUID primary keys with `generate_uuid` from `core.utils.uuid`
- **Columns**: Import column types from `core.db.models.columns`
- **Required Attributes**:
  - `__table_name__`: Database table name (plural, snake_case)
  - `__permission_key__`: Permission identifier (plural, snake_case)
  - `__permission_tenant_scope__`: Boolean for tenant scoping
- **Meta Class**: Include `get_pk_field = 'uid'` for UUID primary keys

Example:
```python
from core.db.models import columns
from core.db.models import BaseTimeStampedModel
from core.utils.uuid import generate_uuid

class Product(BaseTimeStampedModel):
    uid = columns.UUID(primary_key=True, default=generate_uuid)
    name = columns.Text(required=True, max_length=255)
    description = columns.Text(required=False)
    
    __table_name__ = 'products'
    __permission_key__ = 'products'
    __permission_tenant_scope__ = True
    
    class Meta:
        get_pk_field = 'uid'
```

### 2. Repositories
- **Base Class**: Inherit from `BaseRepository` from `core.repositories`
- **Pattern**: Repository handles all database operations
- **Naming**: `{ModelName}Repository`
- **Organization Scoping**: Include methods for tenant-scoped queries

Example:
```python
from core.repositories import BaseRepository
from app_name.models import ModelName

class ModelNameRepository(BaseRepository):
    def __init__(self):
        self.model = ModelName
    
    def get_all_by_organization(self, organization_uid):
        return self.model.objects.filter(organization_uid=organization_uid)
```

### 3. Services
- **Pattern**: Services contain business logic
- **Naming**: `{ModelName}Service`
- **Dependencies**: Inject repositories in `__init__`
- **Methods**: Create, update, delete operations with business rules

Example:
```python
from app_name.repositories import ModelNameRepository

class ModelNameService:
    def __init__(self):
        self.repository = ModelNameRepository()
    
    def create_model(self, organization, data):
        # Business logic here
        return self.repository.create({
            'organization_uid': organization.uid,
            **data
        })
```

### 4. Serializers
- **Response Serializers**: For API responses, inherit from base serializers
- **Request Serializers**: For input validation, separate create/update serializers
- **Naming**: 
  - Response: `{ModelName}Serializer`
  - Request: `Create{ModelName}RequestSerializer`, `Update{ModelName}RequestSerializer`

### 5. Views (ViewSets)
- **Base Classes**: 
  - `UserScopeProtectedModelViewSet` for tenant-scoped endpoints
  - `AdminScopeProtectedModelViewSet` for admin endpoints
- **Permissions**: Use `@permission_required` decorator on all methods
- **Organization Context**: Always extract `organization` from `request.tenant`
- **Standard Methods**: list, create, retrieve, update, destroy
- **Filtering**: Define `filterset_fields` and `search_fields`

Example:
```python
from rest_framework.response import Response
from rest_framework import status
from core.decorators import permission_required
from core.views.api.protected.user import UserScopeProtectedModelViewSet

class ModelNameViewSet(UserScopeProtectedModelViewSet):
    filterset_fields = {
        'name': ['contains', 'exact'],
    }
    search_fields = ['name']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.serializer_class = ModelNameSerializer
        self.repository = ModelNameRepository()
        self.queryset = self.repository.all()
    
    @permission_required(ModelPermissions.MODEL_READ.value)
    def list(self, request, *args, **kwargs):
        organization = getattr(request, 'tenant', None)
        self.queryset = self.repository.get_all_by_organization(
            organization.uid if organization else None
        )
        return super().list(request, *args, **kwargs)
```

### 6. Permissions (Enums)
- **Location**: `enums/{app_name}_permissions.py`
- **Base Class**: Inherit from appropriate base enum
- **Naming**: `{APP_NAME}_{ACTION}` (e.g., `PRODUCTS_READ`, `PRODUCTS_WRITE`)

Example:
```python
from core.enums.base_enum import BaseEnum

class ProductPermissions(BaseEnum):
    PRODUCT_READ = 'products.read'
    PRODUCT_WRITE = 'products.write'
    PRODUCT_DELETE = 'products.delete'
```

### 7. URL Routing
- **Structure**: Separate files for different API contexts (admin, space, consumer, community)
- **Patterns**: Use DRF router for ViewSets
- **Naming**: Consistent URL patterns with app prefixes

Example:
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app_name.views.api.space import ModelNameViewSet

router = DefaultRouter()
router.register(r'model-names', ModelNameViewSet, basename='model-names')

urlpatterns = [
    path('', include(router.urls)),
]
```

### 8. Automatic URL Registration
- **No Manual Registration Required**: Feature URLs are automatically registered by the system
- **Auto-Discovery**: The `core/routing/__init__.py` module automatically scans all installed apps for URL patterns
- **Convention-Based**: URLs are discovered based on the standard routing structure (`app_name/routing/api/`)
- **Multiple API Versions**: Supports automatic registration for multiple API versions (v1, v2)
- **Partner URLs**: Also supports automatic registration of partner-specific URLs when available

**Important**: Do not manually register app URLs in the main project URLs configuration. The system will automatically discover and include them based on the established routing conventions.

## API Endpoint Conventions

### 1. URL Structure
- **Admin**: `/api/admin/{app_name}/{resource}/`
- **Space** (Tenant): `/api/space/{app_name}/{resource}/`
- **Consumer**: `/api/consumer/{app_name}/{resource}/`
- **Community**: `/api/community/{app_name}/{resource}/`

### 2. HTTP Methods
- `GET` - List/Retrieve
- `POST` - Create
- `PUT` - Full Update
- `PATCH` - Partial Update
- `DELETE` - Delete

### 3. Response Format
- Use consistent response structure
- Include proper HTTP status codes
- Handle errors with appropriate error responses

## Multi-Tenancy Considerations

### 1. Organization Scoping
- Always filter data by organization context
- Extract organization from `request.tenant`
- Include organization_uid in create operations

### 2. Permissions
- Use tenant-scoped permissions where applicable
- Set `__permission_tenant_scope__ = True` in models
- Apply permission decorators to all view methods

## Database Considerations

### 1. Cassandra Integration
- The project uses Cassandra as the primary database
- Models use custom column types from `core.db.models.columns`
- Follow Cassandra best practices for data modeling

### 2. UUID Primary Keys
- Always use UUID primary keys for new models
- Use `generate_uuid` utility for default values
- Set `get_pk_field = 'uid'` in model Meta class

## Testing Guidelines

### 1. Test Structure
- Create tests in the `tests/` directory
- Follow the same modular structure as the main code
- Test repositories, services, and API endpoints separately

### 2. Test Data
- Use factories for creating test data
- Mock external dependencies
- Test both success and error scenarios

## Development Workflow

### 1. Creating New Features
1. Use the scaffold template as a starting point
2. Follow the established patterns and conventions
3. Implement in order: Models → Repositories → Services → Serializers → Views → URLs
4. Add appropriate permissions and tests

### 2. Code Quality
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Write comprehensive docstrings
- Ensure proper error handling

### 3. Documentation
- Document API endpoints
- Include usage examples
- Update this guide when patterns change

## Common Patterns

### 1. Error Handling
- Use custom exceptions from `core.exceptions`
- Return appropriate HTTP status codes
- Provide meaningful error messages

### 2. Validation
- Use DRF serializers for input validation
- Implement custom validators when needed
- Validate business rules in services

### 3. Caching
- Use repository caching patterns where appropriate
- Implement cache invalidation strategies
- Consider performance implications

## Integration Points

### 1. External Services
- Use service classes for external API integrations
- Implement proper error handling and retries
- Mock external services in tests

### 2. Background Tasks
- Use Celery for asynchronous tasks
- The background tasks system is configured in the `worker/tasks` directory
- Handle task failures gracefully

This guide should be followed for all code generation and development activities in the MyBranding project to ensure consistency, maintainability, and adherence to established patterns.
