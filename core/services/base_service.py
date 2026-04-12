from core.repositories.base_repository import BaseRepository


class BaseService:
    """
    Base business logic layer for all feature services.

    Delegates standard CRUD operations to the injected repository.
    Subclasses should override or extend methods to add business rules,
    validations, and cross-cutting concerns (e.g. transactions, events).

    Usage:
        class AccountService(BaseService):
            def __init__(self):
                self.repository = AccountRepository()
    """

    repository: BaseRepository

    def get(self, **kwargs):
        """
        Retrieve a single object matching the given keyword arguments.
        @param kwargs: Filter conditions
        @return: model instance or None
        """
        return self.repository.get(**kwargs)

    def find(self, pk):
        """
        Find an object by its primary key.
        @param pk: Primary key value
        @return: model instance or None
        """
        return self.repository.find(pk)

    def find_by_id(self, id):
        """
        Find an object by its integer id field.
        @param id: Integer primary key
        @return: model instance or None
        """
        return self.repository.find_by_id(id)

    def filter(self, **kwargs):
        """
        Retrieve a queryset of objects matching the given keyword arguments.
        @param kwargs: Filter conditions
        @return: QuerySet
        """
        return self.repository.filter(**kwargs)

    def create(self, **kwargs):
        """
        Create a new object with the given keyword arguments.
        @param kwargs: Field values for the new instance
        @return: Newly created model instance
        """
        return self.repository.create(**kwargs)

    def update(self, instance, **kwargs):
        """
        Update an existing object with the given keyword arguments.
        Only saves the provided fields.
        @param instance: Existing model instance to update
        @param kwargs: Fields and new values to apply
        @return: Updated model instance
        """
        return self.repository.update(instance, **kwargs)

    def update_or_create(self, defaults=None, **kwargs):
        """
        Update an object if it exists, or create a new one.
        @param defaults: Dict of fields to set on update/create
        @param kwargs: Lookup fields used to find the existing instance
        @return: Tuple of (instance, created: bool)
        """
        return self.repository.update_or_create(defaults, **kwargs)

    def first_or_create(self, **kwargs):
        """
        Retrieve the first matching object or create a new one if none exists.
        @param kwargs: Filter/creation fields
        @return: model instance
        """
        return self.repository.first_or_create(**kwargs)

    def delete(self, instance):
        """
        Delete the given object.
        @param instance: model instance to delete
        @return: None
        """
        self.repository.delete(instance)

    def all(self):
        """
        Retrieve all objects.
        @return: QuerySet of all instances
        """
        return self.repository.all()

    def first(self, **kwargs):
        """
        Return the first matching object, or None.
        @param kwargs: Filter conditions
        @return: model instance or None
        """
        return self.repository.first(**kwargs)
