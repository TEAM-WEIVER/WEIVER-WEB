import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const PDF_MIME_TYPE = 'application/pdf';
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024;

function isPdfFile(file: File) {
  return file.type === PDF_MIME_TYPE || file.name.toLowerCase().endsWith('.pdf');
}

function validatePortfolioFile(file: File) {
  if (!isPdfFile(file)) {
    return 'PDF 파일만 업로드할 수 있습니다.';
  }

  if (file.size > MAX_PDF_FILE_SIZE) {
    return '10MB 이하의 PDF 파일만 업로드할 수 있습니다.';
  }

  return '';
}

export function usePortfolioFile() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const error = validatePortfolioFile(file);

    if (error) {
      setUploadedFile(null);
      setFileError(error);
      return;
    }

    setUploadedFile(file);
    setFileError('');
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const removeFile = useCallback(() => {
    setUploadedFile(null);
    setFileError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    uploadedFile,
    fileError,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    openFileDialog,
    removeFile,
  };
}
