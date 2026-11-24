import { Plus } from 'lucide-react';
import { useState } from 'react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';

import { emptyValues } from '../_model/resume-editor';
import type { ResumeRow, ResumeSectionConfig } from '../_model/resume-types';
import { clearDisabledFields } from '../_model/resume-validation';
import { ResumeEntryCard } from './resume-entry-card';
import { ResumeEntryForm } from './resume-entry-form';

type ResumeSectionProps<Name extends string> = {
  config: ResumeSectionConfig<Name>;
  rows: ResumeRow<Name>[];
  setRows: (update: (rows: ResumeRow<Name>[]) => ResumeRow<Name>[]) => void;
  noHistory?: boolean;
  onNoHistoryChange?: (noHistory: boolean) => void;
};

export function ResumeSection<Name extends string>({
  config,
  rows,
  setRows,
  noHistory = false,
  onNoHistoryChange,
}: ResumeSectionProps<Name>) {
  const [editingNoHistory, setEditingNoHistory] = useState(false);
  const [emptyRowId, setEmptyRowId] = useState(() => crypto.randomUUID());
  const emptyRow: ResumeRow<Name> = {
    id: emptyRowId,
    state: 'editing',
    input: emptyValues(config.fields),
  };
  const showNoHistory = noHistory && !editingNoHistory;
  const visibleRows = !rows.length && config.noHistoryLabel && !showNoHistory ? [emptyRow] : rows;

  function addRow() {
    const row: ResumeRow<Name> = {
      id: crypto.randomUUID(),
      state: 'editing',
      input: emptyValues(config.fields),
    };
    onNoHistoryChange?.(false);
    setEditingNoHistory(false);
    setRows((current) => [
      ...current.map((entry) =>
        entry.state === 'editing' ? { ...entry, noHistory: false } : entry,
      ),
      row,
    ]);
  }

  function updateRow(id: string, update: (row: ResumeRow<Name>) => ResumeRow<Name>) {
    setRows((current) =>
      (current.length ? current : [emptyRow]).map((row) => (row.id === id ? update(row) : row)),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <section aria-label={config.title} className="space-y-6">
      <div className="border-border-light flex items-start justify-between gap-3 border-b pb-4">
        <SectionHeading as="h2" title={config.title} description={config.description} />
        <Button type="button" variant="outline" className="h-9.5 bg-white" onClick={addRow}>
          <Plus aria-hidden="true" />
          {config.title} 추가
        </Button>
      </div>

      {showNoHistory && config.noHistoryLabel ? (
        <ResumeEntryCard
          summary={{ title: config.noHistoryLabel, details: [] }}
          onEdit={() => setEditingNoHistory(true)}
          onDelete={() => onNoHistoryChange?.(false)}
        />
      ) : null}

      {visibleRows.map((row) => {
        if (row.state === 'editing') {
          return (
            <ResumeEntryForm
              key={row.id}
              config={config}
              values={row.input}
              isEditing={Boolean(row.saved)}
              noHistory={row.noHistory ?? noHistory}
              onNoHistoryChange={(checked) =>
                updateRow(row.id, (current) =>
                  current.state === 'editing' ? { ...current, noHistory: checked } : current,
                )
              }
              onSaveNoHistory={
                config.noHistoryLabel && visibleRows.length === 1 && onNoHistoryChange
                  ? () => {
                      setRows(() => []);
                      onNoHistoryChange(true);
                      setEditingNoHistory(false);
                    }
                  : undefined
              }
              onChange={(name, value) =>
                updateRow(row.id, (current) => {
                  if (current.state !== 'editing') return current;
                  const input = clearDisabledFields(config.fields, {
                    ...current.input,
                    [name]: value,
                  });
                  return { ...current, input };
                })
              }
              onSave={() => {
                updateRow(row.id, (current) =>
                  current.state === 'editing'
                    ? { id: current.id, state: 'saved', saved: current.input }
                    : current,
                );
                onNoHistoryChange?.(false);
                setEditingNoHistory(false);
              }}
              onCancel={() => {
                setEditingNoHistory(false);
                if (row.saved) {
                  updateRow(row.id, (current) =>
                    current.saved
                      ? { id: current.id, state: 'saved', saved: current.saved }
                      : current,
                  );
                } else {
                  removeRow(row.id);
                  setEmptyRowId(crypto.randomUUID());
                }
              }}
            />
          );
        }

        return (
          <ResumeEntryCard
            key={row.id}
            summary={config.summarize(row.saved)}
            onEdit={() =>
              updateRow(row.id, (current) =>
                current.state === 'saved'
                  ? { ...current, state: 'editing', input: current.saved }
                  : current,
              )
            }
            onDelete={() => removeRow(row.id)}
          />
        );
      })}
    </section>
  );
}
