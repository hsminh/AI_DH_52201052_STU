from django.db import models

class DocumentType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    file = models.FileField(upload_to='documents/')
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name='documents', null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.file.name} ({self.document_type.name if self.document_type else 'No Type'})"
