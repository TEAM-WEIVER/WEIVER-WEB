import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  DocumentEditorLayout,
  type DocumentEditorLayoutProps,
} from '@/components/common/DocumentEditorLayout';
import { SectionHeading } from '@/components/common/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateDocumentProgress, type DocumentProgressSection } from '@/lib/document-progress';

import { DocumentItemActions } from '../_components/document-item-actions';
import { PortfolioItemForm } from './portfolio-item-form';
import { isValidPortfolioFile } from './portfolio-file';

type PortfolioItem = {
  id: string;
  title: string;
  file: File;
};

type PortfolioItemDraft = {
  id: string | null;
  title: string;
  file: File | null;
};

export type PortfolioDraft = {
  items: readonly PortfolioItem[];
  editingItem: PortfolioItemDraft | null;
};

type PortfolioEditorProps = Pick<DocumentEditorLayoutProps, 'onDocumentChange' | 'statuses'> & {
  initialItems?: readonly PortfolioItem[];
  initialEditingItem?: PortfolioItemDraft | null;
  progressSections?: readonly DocumentProgressSection<readonly PortfolioItem[]>[];
  onSaveDraft: (draft: PortfolioDraft) => void;
};

const EMPTY_ITEM: PortfolioItemDraft = { id: null, title: '', file: null };
const EMPTY_ITEMS: readonly PortfolioItem[] = [];
const portfolioProgressSections: readonly DocumentProgressSection<readonly PortfolioItem[]>[] = [
  { id: 'portfolio', isComplete: (items) => items.some(({ file }) => isValidPortfolioFile(file)) },
];
const fileSizeFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;

  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 0.1
    ? `${fileSizeFormatter.format(megabytes)}MB`
    : `${fileSizeFormatter.format(bytes / 1024)}KB`;
}

export function PortfolioEditor({
  initialItems = EMPTY_ITEMS,
  initialEditingItem,
  progressSections = portfolioProgressSections,
  onSaveDraft,
  onDocumentChange,
  statuses,
}: PortfolioEditorProps) {
  const [items, setItems] = useState(initialItems);
  const [editingItem, setEditingItem] = useState<PortfolioItemDraft | null>(() =>
    initialEditingItem === undefined
      ? initialItems.length
        ? null
        : EMPTY_ITEM
      : initialEditingItem,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);
  const progress = calculateDocumentProgress(items, progressSections);

  function handleAddItem() {
    if (editingItem) {
      titleInputRef.current?.focus();
      return;
    }

    setEditingItem(EMPTY_ITEM);
  }

  function handleSaveItem(file: File) {
    if (!editingItem) return;

    const item = {
      id: editingItem.id ?? crypto.randomUUID(),
      title: editingItem.title.trim() || file.name,
      file,
    };

    setItems((previous) =>
      editingItem.id
        ? previous.map((entry) => (entry.id === item.id ? item : entry))
        : [...previous, item],
    );
    setEditingItem(null);
  }

  function handleDeleteItem(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));

    if (editingItem?.id === id) {
      setEditingItem(null);
    }
  }

  return (
    <DocumentEditorLayout
      activeDocument="portfolio"
      progress={progress.percentage}
      statuses={{ ...statuses, portfolio: progress.status }}
      onDocumentChange={onDocumentChange}
      onSaveDraft={() => onSaveDraft({ items, editingItem })}
    >
      <div className="space-y-6">
        <div className="border-border-light flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <SectionHeading
            as="h1"
            title="포트폴리오"
            description="PDF 파일로 포트폴리오를 등록하고 관리할 수 있어요."
          />
          <Button
            type="button"
            variant="outline"
            className="bg-card text-text-primary h-10 shadow-none"
            disabled={Boolean(editingItem?.id)}
            onClick={handleAddItem}
          >
            <Plus aria-hidden="true" />
            포트폴리오 추가
          </Button>
        </div>

        {items.length ? (
          <ul className="space-y-4" aria-label="등록한 포트폴리오">
            {items.map((item) => (
              <li
                key={item.id}
                className="border-border-light bg-card flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-xl border p-5"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge
                      variant="outline"
                      className="border-border-light bg-bg-secondary text-text-tertiary rounded-sm text-xs/4 font-normal tracking-[-0.02em]"
                    >
                      PDF 파일
                    </Badge>
                    <h2 className="text-h4 text-text-primary wrap-anywhere">{item.title}</h2>
                  </div>
                  <p className="text-body3 text-text-tertiary wrap-anywhere">
                    {item.title !== item.file.name ? `${item.file.name} · ` : null}
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
                <DocumentItemActions
                  itemTitle={item.title}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  editDisabled={editingItem !== null}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {editingItem ? (
          <PortfolioItemForm
            title={editingItem.title}
            titleInputRef={titleInputRef}
            file={editingItem.file}
            isEditing={editingItem.id !== null}
            onTitleChange={(title) => setEditingItem((current) => current && { ...current, title })}
            onFileChange={(file) => setEditingItem((current) => current && { ...current, file })}
            onSave={handleSaveItem}
            onCancel={() => setEditingItem(null)}
          />
        ) : items.length === 0 ? (
          <p className="text-body2 border-border-light bg-card text-text-tertiary rounded-xl border p-6">
            등록한 포트폴리오가 없어요.
          </p>
        ) : null}
      </div>
    </DocumentEditorLayout>
  );
}
