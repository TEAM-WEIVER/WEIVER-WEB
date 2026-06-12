import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    name.endsWith('.zip');
  return isPdf || isZip;
}

function validatePortfolioFile(file: File) {
  if (!isAllowedFile(file)) {
    return 'PDF 또는 ZIP 파일만 업로드할 수 있습니다.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return '파일 크기는 20MB 이하여야 합니다.';
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
