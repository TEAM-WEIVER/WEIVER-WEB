export type ResumeField<Name extends string> = {
  name: Name;
  label: string;
  placeholder: string;
  width: string;
  required?: boolean;
  options?: readonly string[];
  format?: 'month' | 'date' | 'decimal';
  multiline?: boolean;
  disabledWhen?: { name: Name; value: string };
};

export type ResumeValues<Name extends string> = Record<Name, string>;

export type EntrySummary = {
  title: string;
  details: string[];
  description?: string;
};

export type ResumeSectionConfig<Name extends string> = {
  title: string;
  description: string;
  fields: readonly ResumeField<Name>[];
  summarize: (values: ResumeValues<Name>) => EntrySummary;
};

export type ResumeRow<Name extends string> = { id: string } & (
  | { state: 'saved'; saved: ResumeValues<Name> }
  | { state: 'editing'; input: ResumeValues<Name>; saved?: ResumeValues<Name> }
);
