import type { ChangeEvent, DragEvent, RefObject } from 'react';

import { FileDropzone } from './file-dropzone';
import { SectionTitle } from './section-title';
import { ExistingPortfolioFilePreview, UploadedFilePreview } from './uploaded-file-preview';

interface ExistingPortfolioFile {
  fileName: string;
  fileSize: number | null;
  downloadUrl: string;
}

interface FileUploadSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadedFile: File | null;
  existingFile: ExistingPortfolioFile | null;
  fileError: string;
  isDragging: boolean;
  missingContentError: string;
  onBrowse: () => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onRemove: () => void;
}

export function FileUploadSection({
  fileInputRef,
  uploadedFile,
  existingFile,
  fileError,
  isDragging,
  missingContentError,
  onBrowse,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: FileUploadSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="포트폴리오 파일 업로드" />

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/zip,.pdf,.zip"
          onChange={onFileChange}
          className="hidden"
        />

        {uploadedFile ? (
          <UploadedFilePreview file={uploadedFile} onRemove={onRemove} />
        ) : existingFile ? (
          <div className="flex flex-col gap-3">
            <ExistingPortfolioFilePreview
              fileName={existingFile.fileName}
              fileSize={existingFile.fileSize}
              downloadUrl={existingFile.downloadUrl}
            />
            <FileDropzone
              isDragging={isDragging}
              error={fileError || missingContentError}
              isInvalid={!!fileError || !!missingContentError}
              onBrowse={onBrowse}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          </div>
        ) : (
          <FileDropzone
            isDragging={isDragging}
            error={fileError || missingContentError}
            isInvalid={!!fileError || !!missingContentError}
            onBrowse={onBrowse}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        )}
      </div>
    </div>
  );
}
