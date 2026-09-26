import type {
  JobPostingRequest,
  JobPostingResponse,
  JobPostingUpdate,
} from '@/schemas/corporate/job-posting';

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

export function toUpdateFormData(updateDTO: JobPostingUpdate) {
  const formData = new FormData();
  formData.append('updateDTO', new Blob([JSON.stringify(updateDTO)], { type: 'application/json' }));
  return formData;
}

export function toJobPostingFormValue(response: JobPostingResponse): JobPostingRequest {
  return {
    title: response.title ?? '',
    deadline: response.deadline ?? '',
    jobCategory: response.jobCategory ?? '',
    detailedJob: response.detailedJob ?? '',
    jobDescription: response.jobDescription ?? '',
    qualifications: response.qualifications ?? '',
    requirements: response.requirements ?? '',
    preferredQualifications: response.preferredQualifications ?? '',
    competencyPriorities: response.competencyPriorities ?? [],
    requiredTechs: response.requiredTechs ?? [],
    traitPriorities: response.traitPriorities ?? [],
    emailTitle: response.emailTitle ?? '',
    emailContent: response.emailContent ?? '',
  };
}
