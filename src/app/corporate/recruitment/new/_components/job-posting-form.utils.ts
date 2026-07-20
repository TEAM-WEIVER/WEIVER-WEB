import type { JobPostingRequest } from '@/schemas/corporate/job-posting';

const DATE_SEPARATOR_PATTERN = /[./]/g;
const DATE_INPUT_PATTERN = /^\d{4}[-./]\d{2}[-./]\d{2}$/;

export function normalizeDate(value: string) {
  return value.trim().replace(DATE_SEPARATOR_PATTERN, '-');
}

export function isValidDateInput(value: string) {
  return DATE_INPUT_PATTERN.test(value.trim());
}

export function normalizeTraitTitle(value: string) {
  return value.replace(/\s/g, '');
}

export function toRequestFormData(requestDTO: JobPostingRequest) {
  const formData = new FormData();
  formData.append(
    'requestDTO',
    new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }),
  );
  return formData;
}
