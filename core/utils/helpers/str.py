import random
import re
from uuid import UUID
import unicodedata
from datetime import datetime
import inflect


def generate_random_password(length=15):
    import secrets
    alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


def is_hashed(input_string):
    import re

    return re.match(r'^(pbkdf2_sha256|pbkdf2_sha1|bcrypt|argon2)\$', input_string) is not None


def get_random_number(length):
    """
    Get random number
    @param length:
    @return:
    """
    start = 10 ** (length - 1)
    end = (10 ** length) - 1

    return random.randint(start, end)


def is_date(text: str) -> bool:
    """Check if text is a date in DD/MM/YYYY format"""
    try:
        datetime.strptime(text, "%d/%m/%Y")
        return True
    except ValueError:
        return False


def is_uuid(text: str) -> bool:
    try:
        UUID(text)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def remove_accents(text):
    """
    Remove accents from text for better matching.
    Converts 'Đà Nẵng' to 'Da Nang', 'Hồ Chí Minh' to 'Ho Chi Minh', etc.
    @param text: Input text with possible accents
    @return: Text without accents
    """
    if not text:
        return ''
    # Normalize unicode and remove combining characters (accents)
    normalized = unicodedata.normalize('NFD', text)
    without_accents = ''.join(char for char in normalized if unicodedata.category(char) != 'Mn')
    return without_accents


def to_pascal_case(name):
    """Convert snake_case or kebab-case to PascalCase"""
    # Split by underscore or hyphen and capitalize each part
    parts = re.split(r'[_-]', name)
    return ''.join(word.capitalize() for word in parts)


def to_snake_case(name):
    """Convert to snake_case"""
    # Handle camelCase to snake_case
    name = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name)
    # Replace hyphens with underscores and convert to lowercase
    return name.replace('-', '_').lower()


def to_plural_snake_case(name):
    """Convert to plural snake_case"""
    snake_name = to_snake_case(name)

    # Simple pluralization rules
    return inflect.engine().plural(snake_name)


def strip_hyphens_from_uuid(uuid):
    """
    Strip hyphens from a UUID.
    @param uuid:
    @return:
    """
    return str(uuid).replace('-', '')
