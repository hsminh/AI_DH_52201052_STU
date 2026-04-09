export interface DocumentType {
  id: number;
  name: string;
  description?: string;
}

export interface Document {
  id: number;
  file: string;
  document_type: number;
  uploaded_at: string;
  description?: string;
}
