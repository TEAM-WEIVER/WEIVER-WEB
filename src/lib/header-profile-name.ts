/** 현재 API는 성과 이름을 합쳐 반환한다. 한글 외자는 한 글자, 그 외에는 뒤 두 글자를 표시한다. */
export function getHeaderGivenName(fullName: string | null | undefined) {
  const name = fullName?.trim() ?? '';
  if (/^[가-힣]{2}$/.test(name)) return name.slice(1);
  return Array.from(name).slice(-2).join('');
}
