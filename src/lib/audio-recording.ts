/**
 * #119 답변 녹음 공통 유틸.
 * 시작 화면(녹음 지원 확인)과 녹음 훅(MIME 선택), 업로드 훅(File 생성)이 함께 쓴다.
 */

/** 녹음 MIME 우선순위 (AC1). 모두 서버 허용 형식(audio/webm, audio/ogg, audio/mp4)에 속한다. */
export const AUDIO_MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
] as const;

export type AnswerAudioBaseMimeType = 'audio/webm' | 'audio/ogg' | 'audio/mp4';

const FILE_EXTENSIONS: Record<AnswerAudioBaseMimeType, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
};

/**
 * 브라우저가 지원하는 첫 번째 녹음 MIME을 반환한다.
 * `MediaRecorder` 또는 `isTypeSupported`가 없거나 지원 MIME이 없으면 `null`.
 */
export function getSupportedAudioMimeType(): string | null {
  if (typeof window === 'undefined') return null;
  const recorder = (window as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!recorder || typeof recorder.isTypeSupported !== 'function') return null;

  for (const mimeType of AUDIO_MIME_TYPE_CANDIDATES) {
    try {
      if (recorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      // 일부 브라우저는 알 수 없는 MIME에서 예외를 던진다. 다음 후보로 넘어간다.
    }
  }
  return null;
}

/** `navigator.mediaDevices.getUserMedia`와 지원 MIME이 모두 있을 때만 true (AC13 (A)). */
export function isAudioRecordingSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return false;
  return getSupportedAudioMimeType() !== null;
}

/**
 * `;codecs=...` 파라미터를 뺀 기본 MIME을 반환한다(AC2).
 * 서버 허용 형식이 아니면 우선순위 첫 형식인 `audio/webm`으로 맞춘다.
 */
export function getBaseAudioMimeType(mimeType: string): AnswerAudioBaseMimeType {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (base === 'audio/webm' || base === 'audio/ogg' || base === 'audio/mp4') return base;
  return 'audio/webm';
}

/** 업로드용 File: 기본 MIME + `answer.{webm|ogg|mp4}` (AC2). */
export function createAnswerAudioFile(blob: Blob, mimeType: string): File {
  const baseMimeType = getBaseAudioMimeType(mimeType || blob.type);
  return new File([blob], `answer.${FILE_EXTENSIONS[baseMimeType]}`, { type: baseMimeType });
}
