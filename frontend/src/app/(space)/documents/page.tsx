'use client';
import { useState, useEffect } from 'react';
import { DocumentApi } from '@/modules/documents/api/document.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { FileText, Upload, Trash2, Plus, Brain } from 'lucide-react';
import { Document, DocumentType } from '@/modules/documents/types';

export default function DocumentsPage() {
  const { user, logout } = useAuth('USER');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<number>(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docs, docTypes] = await Promise.all([
        DocumentApi.getDocuments(),
        DocumentApi.getTypes()
      ]);
      setDocuments(docs);
      setTypes(docTypes);
      if (docTypes.length > 0) setSelectedType(docTypes[0].id);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (selectedType) formData.append('document_type', selectedType.toString());
    if (description) formData.append('description', description);

    try {
      await DocumentApi.uploadDocument(formData);
      setSelectedFile(null);
      setDescription('');
      loadData();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await DocumentApi.deleteDocument(id);
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 flex flex-col">
        <div className="flex items-center space-x-2 text-blue-400 mb-8">
          <Brain size={32} />
          <span className="text-xl font-bold">RAG Admin</span>
        </div>
        <nav className="flex-1">
          <div className="bg-slate-800 p-3 rounded-lg flex items-center space-x-3 text-blue-400">
            <FileText size={20} />
            <span className="font-medium">Documents</span>
          </div>
        </nav>
        <button onClick={logout} className="mt-auto p-2 text-slate-400 hover:text-white flex items-center space-x-2">
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Knowledge Base</h1>
              <p className="text-slate-500">Manage documents for RAG training</p>
            </div>
          </div>

          {/* Upload Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-blue-500" />
              Upload New Document
            </h2>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Select File</label>
                <input 
                  type="file" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Document Type (Optional)</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value={0}>No Type</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-600">Description (Optional)</label>
                <input 
                  type="text"
                  placeholder="What is this document about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button 
                  disabled={uploading || !selectedFile}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
                >
                  {uploading ? 'Uploading...' : <><Plus size={18} /> Upload Document</>}
                </button>
              </div>
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Document</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="text-blue-500" size={20} />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{doc.file.split('/').pop()}</div>
                          <div className="text-xs text-slate-500">{doc.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                        {types.find(t => t.id === doc.document_type)?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No documents found. Upload one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
