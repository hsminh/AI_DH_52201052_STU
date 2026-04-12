import os
import shutil
import re
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from core.utils.helpers.str import to_pascal_case, to_snake_case, to_plural_snake_case
from core.management.mixins import AppResolutionMixin


class Command(AppResolutionMixin, BaseCommand):
    help = "Create a new application using the project's scaffold template"

    def add_arguments(self, parser):
        parser.add_argument(
            'app_name',
            type=str,
            help='Name of the app to create (can be app or master_app.app format)'
        )
        parser.add_argument(
            '--target-dir',
            type=str,
            default=None,
            help='Target directory to create the app (defaults to project root)'
        )

    def handle(self, *args, **options):
        app_name = options['app_name']
        target_dir = options.get('target_dir') or settings.BASE_DIR

        # Parse app name
        if '.' in app_name:
            master_app, sub_app = app_name.rsplit('.', 1)
            app_path = Path(target_dir) / master_app / sub_app
            app_module_name = sub_app
            master_module_name = master_app
        else:
            app_path = Path(target_dir) / app_name
            app_module_name = app_name
            master_module_name = app_name

        # Check if app already exists
        if app_path.exists():
            raise CommandError(f'App directory "{app_path}" already exists.')

        # Get scaffold template path
        scaffold_path = Path(settings.BASE_DIR) / 'templates' / 'scaffold' / 'dummy'

        if not scaffold_path.exists():
            raise CommandError(f'Scaffold template not found at "{scaffold_path}"')

        self.stdout.write(f'Creating app "{app_name}" at "{app_path}"...')

        try:
            # Create the app directory structure
            self._copy_scaffold_structure(scaffold_path, app_path, app_module_name, master_module_name)

            # Create __init__.py for master app if it's a nested app and doesn't exist
            if app_module_name != master_module_name:
                master_app_path = Path(target_dir) / master_module_name
                master_init_file = master_app_path / '__init__.py'
                if not master_init_file.exists():
                    master_init_file.touch()
                    self.stdout.write(f'Created {master_init_file}')

            self.stdout.write(
                self.style.SUCCESS(f'Successfully created app "{app_name}" at "{app_path}"')
            )

            # Print next steps
            self._print_next_steps(app_name, app_path)

        except Exception as e:
            # Clean up on error
            if app_path.exists():
                shutil.rmtree(app_path)
            raise CommandError(f'Error creating app: {str(e)}')

    def _copy_scaffold_structure(self, source_path, target_path, app_name, master_app_name):
        """Copy scaffold structure and process templates"""

        for root, dirs, files in os.walk(source_path):
            # Calculate relative path from source
            rel_path = Path(root).relative_to(source_path)
            target_dir = target_path / rel_path

            # Create target directory
            target_dir.mkdir(parents=True, exist_ok=True)

            # Process files
            for file in files:
                source_file = Path(root) / file

                # Determine target filename
                target_filename = self._process_filename(file, app_name)
                target_file = target_dir / target_filename

                # Process file content
                self._process_file(source_file, target_file, app_name, master_app_name)

    def _process_filename(self, filename, app_name):
        """Process filename: rename dummy_*.py.tpl to app_*.py and remove .tpl extension"""
        # Remove .tpl extension
        if filename.endswith('.tpl'):
            filename = filename[:-4]

        # Replace dummy with app name in filename
        filename = filename.replace('dummy', app_name)

        return filename

    def _process_file(self, source_file, target_file, app_name, master_app_name):
        """Process file content: replace placeholders with actual values"""

        with open(source_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace content placeholders
        content = self._replace_content_placeholders(content, app_name, master_app_name)

        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(content)

    def _replace_content_placeholders(self, content, app_name, master_app_name):
        """Replace dummy placeholders with actual app names following Python conventions"""

        # Module names in imports and references
        # For apps.py, use the full module path for nested apps
        if app_name != master_app_name:
            # This is a nested app, use the full dotted path
            full_app_name = f'{master_app_name}.{app_name}'
        else:
            # This is a top-level app
            full_app_name = app_name

        # Import statements: from dummy. -> from full_app_name.
        # Handle both "from dummy." and "from dummy" patterns
        # IMPORTANT: Do this BEFORE replacing individual "dummy" words
        content = re.sub(r'from dummy\.', f'from {full_app_name}.', content)
        content = re.sub(r'import dummy\.', f'import {full_app_name}.', content)

        # Apply specific replacements in order
        snake_case_name = to_snake_case(app_name)
        class_name = to_pascal_case(app_name)
        upper_snake_case = to_snake_case(app_name).upper()
        plural_snake_case = to_plural_snake_case(app_name)

        #  Replace router registration patterns (special case for URL routing - must be done BEFORE package references)
        content = self._replace_router_patterns(content, full_app_name, plural_snake_case)

        # Replace package imports and module references
        content = self._replace_package_references(content, full_app_name)

        # Replace import statements (handles both file names and class names)
        content = self._replace_import_statements(content, snake_case_name, class_name)

        # Replace constants
        content = self._replace_constants(content, upper_snake_case)

        # Replace variable names (only standalone dummy, not in compound names)
        content = self._replace_variable_names(content, snake_case_name)

        # Replace plural forms
        content = self._replace_plural_forms(content, plural_snake_case)

        # App name in AppConfig - use full dotted path for nested apps
        content = re.sub(r"name = '[^']*'", f"name = '{full_app_name}'", content)
        content = re.sub(r'name = "[^"]*"', f'name = "{full_app_name}"', content)

        return content

    def _print_next_steps(self, app_name, app_path):
        """Print helpful next steps for the user"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Next Steps:'))
        self.stdout.write('='*50)

        if '.' in app_name:
            master_app, sub_app = app_name.rsplit('.', 1)
            self.stdout.write(f'1. Add "{master_app}" to INSTALLED_APPS in settings.py')
        else:
            self.stdout.write(f'1. Add "{app_name}" to INSTALLED_APPS in settings.py')

        self.stdout.write('2. Update the model fields in models/ as needed')
        self.stdout.write('3. Configure URL routing in your main application')
        self.stdout.write('4. Update business logic in services/ and repositories/')
        self.stdout.write('5. Customize serializers and views as needed')

        self.stdout.write(f'\nApp created at: {app_path}')
        self.stdout.write('='*50)

    def _replace_package_imports(self, content, packages, snake_case_name):
        """Replace package imports using a systematic approach to avoid mistakes"""

        for module_name, package_path in packages.items():
            # Replace direct module imports: from dummy.models import -> from app.models import
            content = re.sub(
                rf'from dummy\.{module_name} import',
                f'from {package_path} import',
                content
            )

            # Replace submodule imports: from dummy.models.dummy_ -> from app.models.app_name_
            content = re.sub(
                rf'from dummy\.{module_name}\.dummy_',
                f'from {package_path}.{snake_case_name}_',
                content
            )

            # Replace import statements: import dummy.models -> import app.models
            content = re.sub(
                rf'import dummy\.{module_name}',
                f'import {package_path}',
                content
            )

            # Replace dotted references in code: dummy.models.SomeClass -> app.models.SomeClass
            content = re.sub(
                rf'dummy\.{module_name}\.',
                f'{package_path}.',
                content
            )

            # Replace module references in strings (for dynamic imports, etc.)
            content = re.sub(
                rf"'dummy\.{module_name}'",
                f"'{package_path}'",
                content
            )
            content = re.sub(
                rf'"dummy\.{module_name}"',
                f'"{package_path}"',
                content
            )

            # Handle submodule references in strings (like 'dummy.routing.api.admin_urls')
            content = re.sub(
                rf"'dummy\.{module_name}\.([^']+)'",
                rf"'{package_path}.\1'",
                content
            )
            content = re.sub(
                rf'"dummy\.{module_name}\.([^"]+)"',
                rf'"{package_path}.\1"',
                content
            )

        return content

    def _replace_url_includes(self, content, full_app_name):
        """Replace URL include patterns in Django URL configurations"""

        # Replace include() patterns: include('dummy.routing.api.admin_urls') -> include('app.routing.api.admin_urls')
        content = re.sub(
            r"include\(['\"]dummy\.([^'\"]+)['\"]\)",
            rf"include('{full_app_name}.\1')",
            content
        )

        # Remove this general replacement to avoid conflicts with package-based replacements

        return content

    def _replace_package_references(self, content, full_app_name):
        """Replace package imports and module references"""

        # Handle direct imports: from dummy -> from full_app_name
        content = re.sub(r'from dummy(?!\.)', f'from {full_app_name}', content)
        content = re.sub(r'import dummy(?!\.)', f'import {full_app_name}', content)

        # Handle string references to the app
        content = content.replace("'dummy'", f"'{full_app_name}'")
        content = content.replace('"dummy"', f'"{full_app_name}"')

        # Handle URL include patterns: include('dummy.routing.api.admin_urls')
        content = re.sub(
            r"include\(['\"]dummy\.([^'\"]+)['\"]\)",
            rf"include('{full_app_name}.\1')",
            content
        )

        return content

    def _replace_router_patterns(self, content, full_app_name, plural_snake_case):
        """Replace router registration patterns with proper URL format"""

        # For nested apps, use master_app_name/plural_snake_case format
        if '.' in full_app_name:
            master_app_name = full_app_name.split('.')[0]
            url_path = f"{master_app_name}/{plural_snake_case}"
        else:
            # For top-level apps, just use plural_snake_case
            url_path = plural_snake_case

        # Replace router.register patterns
        content = re.sub(
            r"router\.register\(r'dummy'",
            f"router.register(r'{url_path}'",
            content
        )

        return content

    def _replace_class_names(self, content, class_name):
        """Replace class names: Dummy -> AppName"""

        # Replace all occurrences of 'Dummy' in class names
        # This handles all cases: CreateDummyRequestSerializer, DummyRequestSerializer, etc.
        content = re.sub(r'Dummy', class_name, content)

        return content

    def _replace_constants(self, content, upper_snake_case):
        """Replace constants: DUMMY_ -> APP_NAME_"""

        content = re.sub(r'DUMMY_', f'{upper_snake_case}_', content)

        return content

    def _replace_file_names(self, content, snake_case_name):
        """Replace file and module names: dummy_request_serializer -> task_request_serializer"""

        # Handle dummy_ patterns in identifiers (like dummy_request_serializer)
        content = re.sub(r'dummy_', f'{snake_case_name}_', content)

        # Handle relative imports: .dummy_module -> .app_name_module
        content = re.sub(r'\.dummy_', f'.{snake_case_name}_', content)

        return content

    def _replace_import_statements(self, content, snake_case_name, class_name):
        """Replace all dummy patterns comprehensively"""

        # Handle all dummy patterns in one comprehensive function:
        # 1. dummy_ -> snake_case_ (file names, method names)
        # 2. _dummy_ -> _snake_case_ (middle patterns)
        # 3. .dummy_ -> .snake_case_ (relative imports)
        # 4. Dummy -> ClassName (class names)

        # Replace _dummy_ patterns (middle of identifiers)
        content = re.sub(r'_dummy_', f'_{snake_case_name}_', content)

        # Replace dummy_ patterns (beginning of identifiers)
        content = re.sub(r'dummy_', f'{snake_case_name}_', content)

        # Replace .dummy_ patterns (relative imports)
        content = re.sub(r'\.dummy_', f'.{snake_case_name}_', content)

        # Replace Dummy patterns (class names)
        content = re.sub(r'Dummy', class_name, content)

        return content

    def _replace_variable_names(self, content, snake_case_name):
        """Replace variable names: dummy -> app_name (only standalone, not in compound names)"""

        # Replace all instances of 'dummy'
        content = re.sub(r'dummy', snake_case_name, content)

        return content

    def _replace_plural_forms(self, content, plural_snake_case):
        """Replace plural forms: dummies -> app_names"""

        content = re.sub(r'dummies', plural_snake_case, content)

        return content
