class BaseRepository:
    """
    Base data access layer for all Django ORM models.

    Provides standard CRUD operations that all repositories inherit.
    Each repository should set the `model` class attribute to its Django model.

    Usage:
        class AccountRepository(BaseRepository):
            model = Account
    """

    model = None
    pk = 'pk'

    def get(self, **kwargs):
        """
        Retrieve a single model instance matching the given filters.
        Returns None if not found (does not raise DoesNotExist).
        @param kwargs: Filter conditions (e.g., id=1, username='admin')
        @return: model instance or None
        """
        try:
            return self.model.objects.get(**kwargs)
        except self.model.DoesNotExist:
            return None

    def find(self, pk):
        """
        Find a model instance by its primary key value.
        Uses the `pk` attribute defined on the repository class.
        @param pk: Primary key value
        @return: model instance or None
        """
        return self.get(**{self.pk: pk})

    def find_by_id(self, id):
        """
        Find a model instance by its integer `id` field.
        @param id: Integer primary key
        @return: model instance or None
        """
        return self.get(id=id)

    def filter(self, **kwargs):
        """
        Return a queryset of model instances matching the given filters.
        @param kwargs: Filter conditions
        @return: QuerySet
        """
        return self.model.objects.filter(**kwargs)

    def exclude(self, **kwargs):
        """
        Return a queryset excluding model instances matching the given filters.
        @param kwargs: Exclusion conditions
        @return: QuerySet
        """
        return self.model.objects.exclude(**kwargs)

    def create(self, **kwargs):
        """
        Create and save a new model instance.
        @param kwargs: Field values for the new instance
        @return: Newly created model instance
        """
        return self.model.objects.create(**kwargs)

    def update(self, instance, **kwargs):
        """
        Update specific fields on an existing model instance.
        Only saves the provided fields (uses update_fields for efficiency).
        @param instance: Existing model instance to update
        @param kwargs: Fields and new values to apply
        @return: Updated model instance
        """
        for key, value in kwargs.items():
            setattr(instance, key, value)
        instance.save(update_fields=list(kwargs.keys()))
        return instance

    def update_or_create(self, defaults=None, **kwargs):
        """
        Update an instance if it exists, otherwise create a new one.
        @param defaults: Dict of fields to set on update/create
        @param kwargs: Lookup fields used to find the existing instance
        @return: Tuple of (instance, created: bool)
        """
        return self.model.objects.update_or_create(defaults=defaults, **kwargs)

    def first_or_create(self, **kwargs):
        """
        Return the first matching instance, or create one if none exists.
        @param kwargs: Filter/creation fields
        @return: model instance
        """
        obj = self.model.objects.filter(**kwargs).first()
        if obj:
            return obj
        return self.create(**kwargs)

    def delete(self, instance):
        """
        Delete the given model instance from the database.
        @param instance: model instance to delete
        @return: None
        """
        instance.delete()

    def all(self):
        """
        Return all model instances.
        @return: QuerySet of all instances
        """
        return self.model.objects.all()

    def first(self, **kwargs):
        """
        Return the first instance matching the given filters, or None.
        @param kwargs: Filter conditions
        @return: model instance or None
        """
        return self.model.objects.filter(**kwargs).first()
