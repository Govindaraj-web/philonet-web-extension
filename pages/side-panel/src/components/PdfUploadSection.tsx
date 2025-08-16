import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface PdfUploadSectionProps {
  fileName?: string;
  onUploadSuccess: (pdfData: any) => void;
  isUploading?: boolean;
}

export const PdfUploadSection: React.FC<PdfUploadSectionProps> = ({
  fileName,
  onUploadSuccess,
  isUploading = false
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadError('Please select a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setUploadError('File size must be less than 50MB');
      return;
    }

    setUploadError(null);

    try {
      // Get access token
      const { philonetAuthStorage } = await import('../storage/auth-storage');
      const token = await philonetAuthStorage.getToken();
      
      if (!token) {
        throw new Error('No access token available. Please log in.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', file);

      console.log('📤 Uploading PDF file:', file.name);

      // Upload to extract-pdf-content endpoint
      const response = await fetch('http://localhost:3000/v1/client/extract-pdf-content', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status} ${response.statusText}`);
      }

      const pdfData = await response.json();
      console.log('✅ PDF uploaded successfully:', pdfData);

      onUploadSuccess(pdfData);
    } catch (error) {
      console.error('❌ PDF upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {fileName && (
        <div className="text-xs text-blue-300">
          File: <span className="font-medium text-blue-200">{fileName}</span>
        </div>
      )}
      
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-blue-400 bg-blue-900/20'
            : uploadError
            ? 'border-red-400/60 bg-red-900/20'
            : 'border-gray-600 hover:border-blue-500 bg-philonet-black/40'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">Processing PDF...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 text-blue-400">
              <Upload className="w-full h-full" />
            </div>
            <div>
              <p className="text-xs text-gray-300 mb-1">
                Drop PDF file here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PDF files up to 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
          {uploadError}
        </div>
      )}
    </div>
  );
};
