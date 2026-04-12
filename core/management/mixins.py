"""
Management command mixins for common functionality.

This module provides reusable mixins for Django management commands
to handle common operations like app name resolution.
"""

from pathlib import Path
from django.apps import apps
from django.core.management.base import CommandError


class PseudoAppConfig:
    """
    Pseudo app configuration for cases where master app is not installed.
    
    This is used when working with 'masterapp.subapp' format where the master
    app directory exists but is not registered in Django's INSTALLED_APPS.
    """
    
    def __init__(self, name: str, path: str):
        """
        Initialize pseudo app config.
        
        @param name: App name
        @type name: str
        @param path: App directory path
        @type path: str
        """
        self.name = name
        self.path = path
        self.label = name


class AppResolutionMixin:
    """
    Mixin for Django management commands that need to resolve app names.
    
    Supports both simple app names and 'masterapp.subapp' format for
    commands that work with Django apps and their subdirectories.
    
    For 'masterapp.subapp' format, the mixin handles cases where:
    - Master app is installed in Django (normal case)
    - Master app directory exists but is not in INSTALLED_APPS (pseudo config)
    - Subapp is a regular Django app with dotted name
    
    Usage:
        class MyCommand(AppResolutionMixin, BaseCommand):
            def handle(self, *args, **options):
                app_config, resolved_name = self.resolve_app_config(options['app_label'])
                migrations_dir = self.get_migrations_directory(app_config, options['app_label'], resolved_name)
    """

    def resolve_app_config(self, app_label: str):
        """
        Resolve app configuration from app label.
        
        Supports both simple app names and 'masterapp.subapp' format.
        For 'masterapp.subapp' format, handles cases where master app
        may not be installed in Django but directory exists.
        
        @param app_label: App label in format 'app_name' or 'masterapp.subapp'
        @type app_label: str
        @return: Tuple of (app_config or PseudoAppConfig, resolved_app_name)
        @rtype: tuple
        @raises CommandError: If app or directory structure is not found
        """
        # Handle 'masterapp.subapp' format
        if '.' in app_label:
            parts = app_label.split('.')
            if len(parts) == 2:
                master_app, sub_app = parts
                
                # First, try to find it as a regular Django app with dotted name
                try:
                    app_config = apps.get_app_config(app_label)
                    return app_config, app_label
                except LookupError:
                    pass  # Continue with master/subapp logic
                
                # Try to get the master app config
                master_app_config = None
                master_app_path = None
                
                try:
                    master_app_config = apps.get_app_config(master_app)
                    master_app_path = Path(master_app_config.path)
                except LookupError:
                    # Master app not installed, try to find directory in project root
                    from django.conf import settings
                    potential_master_path = Path(settings.BASE_DIR) / master_app
                    if potential_master_path.exists() and potential_master_path.is_dir():
                        master_app_path = potential_master_path
                    else:
                        raise CommandError(
                            f"Master app '{master_app}' not found in Django apps "
                            f"and directory '{potential_master_path}' does not exist"
                        )
                
                # Check if subapp directory exists within master app
                sub_app_path = master_app_path / sub_app
                if sub_app_path.exists() and sub_app_path.is_dir():
                    # Create a pseudo app config for the subapp case
                    if master_app_config:
                        return master_app_config, app_label
                    else:
                        # Create a minimal pseudo config when master app is not installed
                        pseudo_config = PseudoAppConfig(master_app, str(master_app_path))
                        return pseudo_config, app_label
                else:
                    raise CommandError(
                        f"Subapp directory '{sub_app}' not found in '{master_app}' "
                        f"at path '{master_app_path}'"
                    )
            else:
                raise CommandError(
                    f"Invalid app label format: '{app_label}'. "
                    f"Use 'app_name' or 'masterapp.subapp'"
                )
        else:
            # Handle simple app name
            try:
                app_config = apps.get_app_config(app_label)
                return app_config, app_label
            except LookupError:
                raise CommandError(f"App '{app_label}' not found")

    def get_migrations_directory(self, app_config, original_app_name: str, resolved_app_name: str, db_alias: str | None = None) -> Path:
        """
        Get the appropriate migrations directory path.
        
        For 'masterapp.subapp' format, creates migrations in the subapp directory.
        For regular apps, uses the standard app migrations directory.
        If db_alias is provided, returns the alias-specific subdirectory.
        
        @param app_config: Django app configuration
        @param original_app_name: Original app name from command line
        @type original_app_name: str
        @param resolved_app_name: Resolved app name after processing
        @type resolved_app_name: str
        @param db_alias: Optional database alias for alias-specific migration directory
        @type db_alias: str | None
        @return: Path to migrations directory (or alias-specific subdirectory if db_alias provided)
        @rtype: Path
        """
        if '.' in original_app_name and original_app_name == resolved_app_name:
            # Handle 'masterapp.subapp' format
            master_app, sub_app = original_app_name.split('.')
            base_path = Path(app_config.path) / sub_app / 'migrations'
        else:
            # Handle regular app
            base_path = Path(app_config.path) / 'migrations'
        
        # Return alias-specific subdirectory if db_alias is provided
        if db_alias:
            return base_path / db_alias
        
        return base_path

    def get_app_directory(self, app_config, original_app_name: str, resolved_app_name: str) -> Path:
        """
        Get the appropriate app directory path.
        
        For 'masterapp.subapp' format, returns the subapp directory.
        For regular apps, returns the standard app directory.
        
        @param app_config: Django app configuration
        @param original_app_name: Original app name from command line
        @type original_app_name: str
        @param resolved_app_name: Resolved app name after processing
        @type resolved_app_name: str
        @return: Path to app directory
        @rtype: Path
        """
        if '.' in original_app_name and original_app_name == resolved_app_name:
            # Handle 'masterapp.subapp' format
            master_app, sub_app = original_app_name.split('.')
            return Path(app_config.path) / sub_app
        else:
            # Handle regular app
            return Path(app_config.path)

    def validate_app_structure(self, app_config, original_app_name: str, resolved_app_name: str) -> bool:
        """
        Validate that the app structure is correct for the given format.
        
        @param app_config: Django app configuration
        @param original_app_name: Original app name from command line
        @type original_app_name: str
        @param resolved_app_name: Resolved app name after processing
        @type resolved_app_name: str
        @return: True if structure is valid
        @rtype: bool
        @raises CommandError: If structure is invalid
        """
        app_dir = self.get_app_directory(app_config, original_app_name, resolved_app_name)
        
        if not app_dir.exists():
            raise CommandError(f"App directory does not exist: {app_dir}")
        
        if not app_dir.is_dir():
            raise CommandError(f"App path is not a directory: {app_dir}")
        
        return True

    def get_default_db_alias(self, engine_type: str) -> str:
        """
        Get the default database alias for a given engine type.
        
        Maps engine types to their default database aliases:
        - 'sql' → 'ledger'
        - 'cql' → 'default'
        
        @param engine_type: Engine type ('sql' or 'cql')
        @type engine_type: str
        @return: Database alias
        @rtype: str
        """
        if engine_type == 'sql':
            return 'ledger'
        elif engine_type == 'cql':
            return 'default'
        else:
            return 'default'
    
    def get_available_db_aliases(self) -> list[str]:
        """
        Get list of available database aliases.
        
        @return: List of database aliases
        @rtype: list[str]
        """
        from django.conf import settings
        return list(settings.DATABASES.keys()) if hasattr(settings, 'DATABASES') else []

    def add_app_label_argument(self, parser, help_text: str = None):
        """
        Add the standard app_label argument to the command parser.
        
        @param parser: ArgumentParser instance
        @param help_text: Custom help text for the argument
        @type help_text: str
        """
        if help_text is None:
            help_text = 'App label (supports app_name or masterapp.subapp format)'
        
        parser.add_argument(
            'app_label',
            help=help_text
        )