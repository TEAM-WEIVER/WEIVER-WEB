import { Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { SectionTitle } from './section-title';

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-button1 border-border-default bg-bg-primary text-text-primary hover:bg-bg-tertiary flex items-center gap-1 rounded-md border px-2 py-1.5 transition-colors"
    >
      <Plus size={20} />
      {label}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-disabled hover:bg-primary-200 hover:text-text-tertiary absolute top-3 right-3 rounded-full p-1 transition-colors"
    >
      <X size={18} />
    </button>
  );
}

export function RepeatableSection({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <SectionTitle title={title} />
        <AddButton label={addLabel} onClick={onAdd} />
      </div>
      {children}
    </div>
  );
}
