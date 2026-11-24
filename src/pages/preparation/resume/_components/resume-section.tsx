import { Plus } from 'lucide-react';

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
};

export function ResumeSection<Name extends string>({
  config,
  rows,
  setRows,
}: ResumeSectionProps<Name>) {
  function addRow() {
    const row: ResumeRow<Name> = {
      id: crypto.randomUUID(),
      state: 'editing',
      input: emptyValues(config.fields),
    };
    setRows((current) => [...current, row]);
  }

  function updateRow(id: string, update: (row: ResumeRow<Name>) => ResumeRow<Name>) {
    setRows((current) => current.map((row) => (row.id === id ? update(row) : row)));
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

      {rows.map((row) => {
        if (row.state === 'editing') {
          return (
            <ResumeEntryForm
              key={row.id}
              config={config}
              values={row.input}
              isEditing={Boolean(row.saved)}
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
              onSave={() =>
                updateRow(row.id, (current) =>
                  current.state === 'editing'
                    ? { id: current.id, state: 'saved', saved: current.input }
                    : current,
                )
              }
              onCancel={() => {
                if (row.saved) {
                  updateRow(row.id, (current) =>
                    current.saved
                      ? { id: current.id, state: 'saved', saved: current.saved }
                      : current,
                  );
                } else {
                  removeRow(row.id);
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
