import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileImage,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Tag,
  ArrowRight,
  Stamp,
  Images,
  Cloud,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { designsApi, projectsApi, uploadApi } from '../../api/index.js';
import { Project } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const UploadCenter: React.FC = () => {
  const { role, permissions } = useAuthStore();
  const navigate = useNavigate();

  const canUpload = role === 'Company' || (role === 'Designer' && permissions?.canUpload !== false);

  const [activeTab, setActiveTab] = useState<'images' | 'documents'>('images');
  const [files, setFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; count: number; message?: string } | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{ configured: boolean; cloudName?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canUpload) return;
    projectsApi.list().then((res) => setProjects(res.data.data || []));
    uploadApi.getCloudinaryStatus().then((res) => setCloudinaryStatus(res.data.data)).catch(() => {});
  }, [canUpload]);

  if (!canUpload) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1E293B] font-heading">Upload Restricted</h2>
        <p className="text-xs text-[#64748B]">
          Your account does not have permission to upload jewellery images or master assets.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validFiles: File[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (validExtensions.includes(file.type.toLowerCase())) {
        validFiles.push(file);
      } else {
        alert(`File ${file.name} is not supported. Only JPEG, PNG, and WebP are allowed.`);
      }
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDocumentsSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles: File[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      validFiles.push(newFiles[i]);
    }

    setDocumentFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDocFile = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(20);
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    if (selectedProjectId) formData.append('projectId', selectedProjectId);
    if (skuPrefix) formData.append('skuPrefix', skuPrefix.trim());
    if (tags) formData.append('tags', tags);

    try {
      setUploadProgress(60);
      const res = await designsApi.upload(formData);
      setUploadProgress(100);
      setResult({
        success: true,
        count: res.data.data.length,
      });
      setFiles([]);
      setSkuPrefix('');
      setTags('');
    } catch (err: any) {
      setResult({
        success: false,
        count: 0,
        message: err.response?.data?.message || 'Upload failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (documentFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(30);

    const formData = new FormData();
    documentFiles.forEach((doc) => formData.append('documents', doc));

    try {
      setUploadProgress(70);
      const res = await uploadApi.uploadDocument(formData);
      setUploadProgress(100);
      setUploadedDocuments((prev) => [...res.data.data, ...prev]);
      setDocumentFiles([]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Upload Center</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Upload jewellery master photos, CAD renders, certificates, and hallmarking documents.
          </p>
        </div>

        {cloudinaryStatus && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-xs">
            <Cloud className="w-4 h-4 text-[#7C3AED]" />
            <div className="text-left">
              <div className="text-[10px] text-[#64748B]">Cloud Storage</div>
              <div className="text-xs font-semibold text-[#1E293B]">
                {cloudinaryStatus.configured ? `Cloudinary (${cloudinaryStatus.cloudName})` : 'Local Isolated Storage'}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] ml-1" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('images')}
          className={`pb-3 text-xs font-bold font-heading border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'images'
              ? 'border-[#7C3AED] text-[#7C3AED]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <FileImage className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Jewellery Photography</span>
          <span className="sm:hidden">Photos</span> ({files.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-xs font-bold font-heading border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-[#7C3AED] text-[#7C3AED]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Certificates & Documents</span>
          <span className="sm:hidden">Documents</span> ({documentFiles.length})
        </button>
      </div>

      {activeTab === 'images' ? (
        <>
          {result && result.success && (
            <Card className="bg-[#16A34A]/10 border-[#16A34A]/25 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#16A34A] flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] font-heading">
                      Upload Complete! ({result.count} Images Added)
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Images have been securely decoded, synchronized with Cloudinary, and saved.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(role === 'Company' ? '/company/gallery' : '/designer/gallery')}
                  >
                    <Images className="w-3.5 h-3.5 mr-1" /> View Gallery
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(role === 'Company' ? '/company/editor' : '/designer/editor')}
                  >
                    <Stamp className="w-3.5 h-3.5 mr-1" /> Open Watermark Studio
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {result && !result.success && (
            <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{result.message}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-[#7C3AED] bg-white rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                Drag & drop jewellery images here, or{' '}
                <span className="text-[#7C3AED] underline">browse files</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Supports high-resolution JPEG, PNG, and WebP (up to 25MB each, max 50 images per batch)
              </p>
            </div>

            {/* Selected Files Staging Preview */}
            {files.length > 0 && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#1E293B] font-heading">
                    Selected Images ({files.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="text-xs text-[#DC2626] hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-60 overflow-y-auto p-1">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg border border-[#E2E8F0] p-2 bg-[#F8FAFC] flex flex-col items-center text-center"
                    >
                      <FileImage className="w-8 h-8 text-[#7C3AED] mb-1" />
                      <span className="text-[11px] font-semibold text-[#1E293B] truncate w-full">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[#DC2626] text-white opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Batch Metadata Settings */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                Collection & Product Indexing (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                    Assign to Collection
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-medium focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="">No Collection (Unassigned)</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                    SKU Prefix Generator
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SOL-RNG-2026"
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 18k, diamond, export"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-[#64748B]">
                    <span>Uploading and syncing with Cloudinary...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#7C3AED] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={files.length === 0 || uploading}
                  variant="primary"
                  size="md"
                >
                  <UploadCloud className="w-4 h-4 mr-1.5" />
                  {uploading ? 'Processing Upload...' : `Upload ${files.length} Jewellery Images`}
                </Button>
              </div>
            </Card>
          </form>
        </>
      ) : (
        /* Documents Tab */
        <div className="space-y-6">
          <form onSubmit={handleDocumentSubmit} className="space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDocumentsSelected(e.dataTransfer.files);
              }}
              onClick={() => docInputRef.current?.click()}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-[#7C3AED] bg-white rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center group"
            >
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(e) => handleDocumentsSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-[#B8860B]/10 text-[#B8860B] flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">
                Upload Jewellery Certificates & Documentation
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Supports PDF, Word, Excel, CSV, and Text files (GIA/IGI certificates, valuation reports, export manifests)
              </p>
            </div>

            {documentFiles.length > 0 && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#1E293B] font-heading">
                    Staged Documents ({documentFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocumentFiles([])}
                    className="text-xs text-[#DC2626] hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2">
                  {documentFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-5 h-5 text-[#B8860B] flex-shrink-0" />
                        <span className="text-xs font-semibold text-[#1E293B] truncate">{doc.name}</span>
                        <span className="text-[10px] text-[#64748B]">({(doc.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocFile(idx)}
                        className="text-[#DC2626] hover:text-[#B91C1C] p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={uploading}
                    variant="primary"
                    size="md"
                  >
                    <UploadCloud className="w-4 h-4 mr-1.5" />
                    {uploading ? 'Uploading to Cloudinary...' : `Upload ${documentFiles.length} Document(s)`}
                  </Button>
                </div>
              </Card>
            )}
          </form>

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <Card className="space-y-3">
              <h3 className="text-xs font-bold text-[#1E293B] font-heading">
                Recently Uploaded Documents ({uploadedDocuments.length})
              </h3>
              <div className="space-y-2">
                {uploadedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#7C3AED]/40 transition"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-5 h-5 text-[#7C3AED] flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-[#1E293B] truncate">{doc.filename}</div>
                        <div className="text-[10px] text-[#64748B]">
                          {(doc.fileSize / 1024).toFixed(0)} KB • {doc.mimeType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(doc.url, doc.id)}
                      >
                        {copiedId === doc.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#16A34A] mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                          </>
                        )}
                      </Button>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#7C3AED] hover:border-[#7C3AED] transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
