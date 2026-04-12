# Create New App with Scaffold

Create a new Django app using the custom scaffold template

```bash
python3 manage.py startapp_scaffold <app_name>
```

For nested apps (sub-apps within a master app):

```bash
python3 manage.py startapp_scaffold <master_app>.<sub_app>
```

With custom target directory:

```bash
python3 manage.py startapp_scaffold <app_name> --target-dir /path/to/directory
```


# Scaffold Templates Information

## Dummy Scaffold

The project includes a scaffold template system for rapid development. The dummy scaffold provides a complete template structure for creating new Django applications with standardized patterns.

### New Application Structure

The dummy scaffold is located at `templates/scaffold/dummy/` 
The scaffold consists of template files in the *.py.tpl format.
That folder contains files and directories adhering to Django project best practices in my projects
Its structure is as follows:

```
dummy/
├── enums/
│   ├── __init__.py
│   └── dummy_permissions.py
├── models/
│   ├── __init__.py
│   └── dummy.py
├── repositories/
│   ├── __init__.py
│   └── dummy_repository.py
├── serializers/
│   ├── requests/
│   ├── __init__.py
│   └── dummy_serializer.py
├── services/
│   ├── __init__.py
│   └── dummy_service.py
├── views/
│   └── api/
│       ├── admin/
│       │   ├── __init__.py
│       │   └── dummy_admin_model_view_set.py
│       ├── space/
│       │   ├── __init__.py
│       │   └── dummy_model_view_set.py
│       ├── consumer/
│       │   └── __init__.py
│       ├── community/
│       │   └── __init__.py
│       └── __init__.py
├── routing/
│   └── api/
│       ├── __init__.py
│       ├── admin_urls.py
│       ├── space_urls.py
│       ├── consumer_urls.py
│       └── community_urls.py
└── __init__.py
```

### API Endpoints

The scaffold provides pre-configured API endpoints for both admin and space contexts:

#### Space API Endpoints
- **Base URL**: `/api/space/dummy/`
- **ViewSet**: `DummyModelViewSet`
- **Supported Operations**:
  - `GET /api/space/dummy/` - List all dummy objects
  - `POST /api/space/dummy/` - Create a new dummy object
  - `GET /api/space/dummy/{id}/` - Retrieve a specific dummy object
  - `PUT /api/space/dummy/{id}/` - Update a specific dummy object
  - `PATCH /api/space/dummy/{id}/` - Partially update a dummy object
  - `DELETE /api/space/dummy/{id}/` - Delete a dummy object

#### Admin API Endpoints
- **Base URL**: `/api/admin/dummy/`
- **ViewSet**: `DummyAdminModelViewSet`
- **Supported Operations**: Same as space endpoints but with admin-level permissions

### Features Included

- **Permission-based Access Control**: Uses `@permission_required` decorators
- **Repository Pattern**: Separates data access logic
- **Service Layer**: Business logic encapsulation
- **Request/Response Serializers**: Structured data validation
- **Filtering and Search**: Built-in support for DRF filtering
- **Pagination**: Automatic pagination support
- **Multi-tenant Support**: Organization-scoped data access
