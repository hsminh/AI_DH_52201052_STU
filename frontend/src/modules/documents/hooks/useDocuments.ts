import { useState, useEffect } from 'react';
import { DocumentApi } from '../api/document.api';
import { DocumentType, Document } from '../types';

export const useDocuments = () => {
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTypes = async () => {
    try {
      const data = await DocumentApi.getTypes();
      setTypes(data);
    } catch (err) {}
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await DocumentApi.getDocuments();
      setDocuments(data);
    } catch (err) {}
    setLoading(false);
  };

  const upload = async (formData: FormData) => {
    setLoading(true);
    try {
      await DocumentApi.uploadDocument(formData);
      await fetchDocuments();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await DocumentApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {}
  };

  return { types, documents, loading, fetchTypes, fetchDocuments, upload, remove };
};
