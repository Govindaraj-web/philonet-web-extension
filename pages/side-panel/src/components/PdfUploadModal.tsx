import React, { useState, useRef } from 'react';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (pdfData: any) => void;
  fileName?: string;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  fileName
}) => {
  const [isUploading, setIsUploading] = useState(false);
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

    setIsUploading(true);
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
      onClose();
    } catch (error) {
      console.error('❌ PDF upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-philonet-panel rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Upload PDF File
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl transition-colors"
            disabled={isUploading}
          >
            ×
          </button>
        </div>

        {fileName && (
          <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <p className="text-sm text-blue-200">
              Local file detected: <span className="font-medium text-blue-100">{fileName}</span>
            </p>
            <p className="text-xs text-blue-300 mt-1">
              Please upload this file to process it.
            </p>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-900/20'
              : uploadError
              ? 'border-red-400/60 bg-red-900/20'
              : 'border-gray-600 hover:border-gray-500 bg-philonet-black/40'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
            <div className="space-y-3">
              <div className="mx-auto w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-300">Uploading PDF...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-2">
                  Drag and drop your PDF file here, or
                </p>
                <button
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Browse Files
                </button>
              </div>
              <p className="text-xs text-gray-400">
                PDF files up to 50MB
              </p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-sm text-red-200">{uploadError}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
