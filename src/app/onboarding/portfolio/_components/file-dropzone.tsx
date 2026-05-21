import { CloudUpload } from 'lucide-react';
import type { DragEvent } from 'react';

interface FileDropzoneProps {
  isDragging: boolean;
  error: string;
  onBrowse: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export function FileDropzone({
  isDragging,
  error,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileDropzoneProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onBrowse}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3.5 rounded-lg border border-dashed px-10 py-12 transition-colors ${
          isDragging ? 'border-primary-700 bg-primary-200' : 'border-border-default bg-bg-tertiary'
        }`}
      >
        <CloudUpload size={24} className="text-icon-muted" />
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-body1 text-text-secondary">
            클릭하거나 파일을 드래그하여 업로드하세요
          </p>
          <p className="text-body3 text-text-disabled">PDF 파일만 업로드 가능 (최대 10MB)</p>
        </div>
      </button>

      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}
