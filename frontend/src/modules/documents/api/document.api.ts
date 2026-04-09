import { AbstractApiClient } from '@/shared/api/base.api';
import { DocumentType, Document } from '../types';

export class DocumentApi extends AbstractApiClient {
  static async getTypes(): Promise<DocumentType[]> {
    return this.request('/documents/types/', {
      method: 'GET',
      headers: await this.getHeaders(),
    });
  }

  static async getDocuments(): Promise<Document[]> {
    return this.request('/documents/', {
      method: 'GET',
      headers: await this.getHeaders(),
    });
  }

  static async uploadDocument(data: FormData): Promise<Document> {
    return this.request('/documents/', {
      method: 'POST',
      headers: await this.getHeaders(true),
      body: data,
    });
  }

  static async deleteDocument(id: number): Promise<void> {
    return this.request(`/documents/${id}/`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
  }
}
