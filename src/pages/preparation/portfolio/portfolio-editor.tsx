import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import { DocumentEditorLayout } from '@/components/common/DocumentEditorLayout';
import { Button } from '@/components/ui/button';

import { PortfolioItemForm } from './portfolio-item-form';

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

type PortfolioEditorProps = {
  initialItems?: readonly PortfolioItem[];
  onSaveDraft: (draft: PortfolioDraft) => void;
};

const EMPTY_ITEM: PortfolioItemDraft = { id: null, title: '', file: null };
const EMPTY_ITEMS: readonly PortfolioItem[] = [];
const fileSizeFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;

  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 0.1
    ? `${fileSizeFormatter.format(megabytes)}MB`
    : `${fileSizeFormatter.format(bytes / 1024)}KB`;
}

export function PortfolioEditor({ initialItems = EMPTY_ITEMS, onSaveDraft }: PortfolioEditorProps) {
  const [items, setItems] = useState(initialItems);
  const [editingItem, setEditingItem] = useState<PortfolioItemDraft | null>(() =>
    initialItems.length ? null : EMPTY_ITEM,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

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
      progress={items.length ? 100 : 0}
      onSaveDraft={() => onSaveDraft({ items, editingItem })}
    >
      <div className="space-y-6">
        <div className="border-border-light flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <h1 className="text-h3 text-text-primary">포트폴리오</h1>
            <p className="text-body2 text-text-tertiary">
              PDF 파일로 포트폴리오를 등록하고 관리할 수 있어요.
            </p>
          </div>
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
                    <span className="text-caption border-border-light bg-bg-secondary text-text-tertiary rounded-sm border px-2 py-0.5">
                      PDF 파일
                    </span>
                    <h2 className="text-h4 text-text-primary wrap-anywhere">{item.title}</h2>
                  </div>
                  <p className="text-body3 text-text-tertiary wrap-anywhere">
                    {item.title !== item.file.name ? `${item.file.name} · ` : null}
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-body3 text-text-tertiary h-8 px-2"
                    aria-label={`${item.title} 수정`}
                    disabled={editingItem !== null}
                    onClick={() => setEditingItem(item)}
                  >
                    수정
                  </Button>
                  <span aria-hidden="true" className="border-border-default h-3 border-l" />
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-body3 text-destructive hover:text-destructive h-8 px-2"
                    aria-label={`${item.title} 삭제`}
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    삭제
                  </Button>
                </div>
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
