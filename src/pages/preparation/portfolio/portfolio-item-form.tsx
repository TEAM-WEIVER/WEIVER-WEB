import { useId, useRef, useState, type DragEvent, type Ref } from 'react';
import { CloudUpload, FileText, FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PortfolioItemFormProps = {
  title: string;
  titleInputRef: Ref<HTMLInputElement>;
  file: File | null;
  isEditing: boolean;
  onTitleChange: (title: string) => void;
  onFileChange: (file: File) => void;
  onSave: (file: File) => void;
  onCancel: () => void;
};

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const PDF_FILE_TYPES = '.pdf,application/pdf';

export function PortfolioItemForm({
  title,
  titleInputRef,
  file,
  isEditing,
  onTitleChange,
  onFileChange,
  onSave,
  onCancel,
}: PortfolioItemFormProps) {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  function selectFiles(files: FileList) {
    if (!files.length) return;

    const selectedFile = files[0];
    const isPdf =
      selectedFile.type === 'application/pdf' ||
      (!selectedFile.type && /\.pdf$/i.test(selectedFile.name));

    if (files.length > 1) {
      setFileError('한 항목에 PDF 파일 하나만 첨부할 수 있어요.');
    } else if (!isPdf) {
      setFileError('PDF 파일을 선택해주세요.');
    } else if (selectedFile.size > MAX_PDF_SIZE) {
      setFileError('20MB 이하의 PDF 파일을 선택해주세요.');
    } else {
      setFileError('');
      onFileChange(selectedFile);
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return;

    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  return (
    <form
      aria-labelledby={`${id}-heading`}
      className="border-border-default bg-card space-y-5 rounded-xl border p-6"
      onSubmit={(event) => {
        event.preventDefault();

        if (file) {
          onSave(file);
        } else {
          setFileError('PDF 파일을 선택해주세요.');
        }
      }}
    >
      <h2
        id={`${id}-heading`}
        className="text-body2 border-border-light text-text-primary border-b pb-4"
      >
        {isEditing ? '포트폴리오 수정' : '포트폴리오 등록'}
      </h2>

      <div className="space-y-2">
        <label htmlFor={`${id}-title`} className="text-body2 text-text-primary block">
          포트폴리오 제목
        </label>
        <Input
          ref={titleInputRef}
          id={`${id}-title`}
          value={title}
          variant="default"
          className="h-10 px-3 py-2"
          placeholder="입력하지 않으면 파일명으로 자동 입력됩니다."
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>

      <div
        role="group"
        aria-label="PDF 파일 첨부"
        data-dragging={isDragging ? 'true' : undefined}
        className="border-border-default bg-bg-secondary data-[dragging=true]:border-primary data-[dragging=true]:bg-primary-100 flex min-h-52 min-w-0 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center"
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="bg-bg-tertiary text-primary flex size-10 items-center justify-center rounded-full">
          {file ? (
            <FileText aria-hidden="true" size={20} />
          ) : (
            <CloudUpload aria-hidden="true" size={20} />
          )}
        </div>
        <div className="w-full min-w-0 space-y-1">
          <p aria-live="polite" className="text-body2 text-text-primary wrap-anywhere">
            {file ? file.name : '파일을 드래그하거나 선택하여 첨부해주세요.'}
          </p>
          <p id={`${id}-file-help`} className="text-body3 text-text-tertiary">
            PDF 파일을 첨부할 수 있어요. (최대 20MB)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={PDF_FILE_TYPES}
          aria-label="포트폴리오 PDF 파일"
          hidden
          onChange={(event) => {
            if (event.currentTarget.files) selectFiles(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="bg-card h-8 shadow-none"
          aria-describedby={`${id}-file-help`}
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen aria-hidden="true" />
          {file ? '파일 변경' : '파일 선택'}
        </Button>
      </div>
      {fileError ? (
        <p className="text-body3 text-destructive" role="alert">
          {fileError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          className="bg-card h-9 shadow-none"
          onClick={onCancel}
        >
          취소
        </Button>
        <Button type="submit" className="h-9">
          저장
        </Button>
      </div>
    </form>
  );
}
