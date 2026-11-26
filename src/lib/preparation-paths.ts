import type { EditorDocument } from '@/components/common/DocumentEditorLayout';

export const PREPARATION_PATH = '/preparation';
export const MASTER_RESUME_PATH = '/resume/master';

export function postingPath(postingId: string) {
  return `${PREPARATION_PATH}/${encodeURIComponent(postingId)}`;
}

export function interviewPreparationPath(postingId: string) {
  return `${postingPath(postingId)}/interview/prepare`;
}

export function postingDocumentPath(postingId: string, document: EditorDocument = 'resume') {
  return `${postingPath(postingId)}/${document}`;
}

/** 복귀 경로는 공고 ID로만 구성한다. 임의의 리다이렉트 URL은 받지 않는다. */
export function masterResumePath(postingId?: string) {
  return postingId
    ? `${MASTER_RESUME_PATH}?${new URLSearchParams({ postingId })}`
    : MASTER_RESUME_PATH;
}
