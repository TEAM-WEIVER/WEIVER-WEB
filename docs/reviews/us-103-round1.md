# #103 기획 검토 — Round 1

## 결과

PASS — Critical 0, Major 0, Minor 0

## 확인 항목

- 기존 `/corporate/recruitment/[jdId]` 지원자 목록 URL을 보존하고 수정 화면을 `/edit` 하위 경로로 분리했다.
- 공개 Swagger 계약을 확인해 PUT multipart 키를 `requestDTO`가 아닌 `updateDTO`로 수정하고, 전체 배열 스냅샷 및 `isEmailBannerDeleted: false`를 명시했다.
- 수정 성공 후 refresh query를 `ApplicantListView` key로 전달해 지원자 목록이 새로 마운트되고 API를 재요청하도록 명시했다.
- 삭제 성공 시 history를 남기지 않는 `replace` 이동과 실패·취소 상태를 AC에 포함했다.

## 다음 단계

HTML 목업 생성 후 사람 검증을 거쳐 ATDD 단계로 진행한다.
