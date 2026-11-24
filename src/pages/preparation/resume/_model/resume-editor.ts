import type { ResumeField, ResumeRow, ResumeValues } from './resume-types';
import { clearDisabledFields, validateEntry } from './resume-validation';

export function emptyValues<Name extends string>(
  fields: readonly ResumeField<Name>[],
): ResumeValues<Name> {
  return Object.fromEntries(fields.map(({ name }) => [name, ''])) as ResumeValues<Name>;
}

export function initializeRows<Name extends string>(
  fields: readonly ResumeField<Name>[],
  initialValues?: ResumeValues<Name>[],
): ResumeRow<Name>[] {
  if (!initialValues) return [{ id: 'initial-0', state: 'editing', input: emptyValues(fields) }];

  return initialValues.map<ResumeRow<Name>>((values, index) => {
    const id = `initial-${index}`;
    const input = clearDisabledFields(fields, values);

    return Object.keys(validateEntry(fields, input)).length
      ? { id, state: 'editing', input }
      : { id, state: 'saved', saved: input };
  });
}

export function collectDraftValues<Name extends string>(rows: ResumeRow<Name>[]) {
  return rows.flatMap((row) => {
    const values = row.state === 'editing' ? row.input : row.saved;
    return row.saved || Object.values<string>(values).some((value) => value.trim())
      ? [{ ...values }]
      : [];
  });
}
