import type { ChangeEvent, DragEvent, RefObject } from 'react';

import { FileDropzone } from './file-dropzone';
import { SectionTitle } from './section-title';
import { UploadedFilePreview } from './uploaded-file-preview';

interface FileUploadSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadedFile: File | null;
  fileError: string;
  isDragging: boolean;
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
  fileError,
  isDragging,
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
          accept="application/pdf,.pdf"
          onChange={onFileChange}
          className="hidden"
        />

        {uploadedFile ? (
          <UploadedFilePreview file={uploadedFile} onRemove={onRemove} />
        ) : (
          <FileDropzone
            isDragging={isDragging}
            error={fileError}
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
