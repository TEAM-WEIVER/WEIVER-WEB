import { Trash2 } from 'lucide-react';

import { formatFileSize } from './file-size';
import { PdfFileIcon } from './portfolio-icons';

export function UploadedFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="border-border-light bg-bg-primary flex items-center justify-between rounded-lg border px-6 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center">
          <PdfFileIcon />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-body2 text-text-secondary truncate">{file.name}</span>
          <span className="text-caption text-text-disabled">{formatFileSize(file.size)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-border-default hover:text-error shrink-0 p-1 transition-colors"
        aria-label="업로드 파일 삭제"
      >
        <Trash2 size={24} />
      </button>
    </div>
  );
}
