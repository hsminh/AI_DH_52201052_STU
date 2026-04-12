## Project Overview
This is a multi-tenant Django REST Framework (DRF) project with a modular architecture. The project follows a domain-driven design approach with clear separation of concerns using repositories, services, and API layers.

## Project Structure
```
project_root/                        # Root directory
│
├── manage.py                    # Django CLI utility
├── pyproject.toml
│
├── mybranding/                  # Project configuration package (same name as root)
│   ├── __init__.py
│   ├── configs                  # Seperated configuration files
│   ├── settings.py              # Main settings file
│   ├── urls.py                  # Root URL configuration
│   ├── task.py                  # Task configuration
│   ├── wsgi.py                  # WSGI entry point
│   └── asgi.py                  # ASGI entry point
│
├── core/                        # Core application for project-wide functionality
│   ├── __init__.py
│   ├── cache/                   # Example Core app
│   └── ...
├── <feature>/                   # specific features
├── ...
├── templates/                   # Global templates
│   ├── emails/
│   └── staticfiles/
│   └── scaffold/                # Scaffold templates for generate new application for development 
│
├── static/                      # Global static files (CSS, JS, images)
│
├── storage/                     # Project storage, store logs, temporary files and media files
│
└── README.md

```
