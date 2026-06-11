# US 리뷰 — #34 Round 2

## 판정: PASS (조건부)

> R1의 Critical 4건 중 3건 해소, Major 6건 중 5건 해소.
> 잔존 Minor 항목은 사람 판단 영역으로 남긴다.

---

## R1 해소 여부 추적

| R1 항목 | 해소 여부 | 비고 |
|---------|----------|------|
| Critical — 다중 API 부분 성공 롤백 미정의 | 해소 | AC2에서 에러 시 이동 불가 + 재시도 명시 |
| Critical — GET→POST/PATCH race condition / "없음" 계약 미확정 | 부분 해소 | API 연동 섹션에 "없음" 계약 명시됨. race condition 방지(버튼 즉시 disable)는 AC1/AC4/AC8에 명시. 단, GET 응답이 404인 경우 처리는 여전히 "협의 필요" 상태 → Minor로 강등 |
| Critical — answer 포맷 미확정 | 부분 해소 | AC4 주석에 협의 필요 사항으로 명시. 테스트 시 mockable한 수준은 충족 → Minor로 강등 |
| Critical — PIPA 동의 절차 누락 | 해소 | AC 목록에서 삭제 처리됨 (별도 이슈 분리로 해소 간주) |
| Major — "나중에 작성" 라우팅 충돌 | 해소 | AC3/AC7/AC11에 "미완료 상태" 및 대시보드 안내 명시 |
| Major — cover-letter/portfolio 건너뜀 누락 | 해소 | AC7, AC11 추가됨 |
| Major — 포트폴리오 파일·URL 모두 없을 때 미정의 | 해소 | AC8 Given에 "파일·URL은 선택 사항" 명시, 협의 필요 항목으로 등록 |
| Major — 이력서 세부 항목 부분 입력 validation 없음 | 미해소 | 여전히 AC 없음 → Major 잔존 |
| Major — 자기소개서·포트폴리오 API 실패 에러 케이스 누락 | 해소 | AC6, AC10 추가됨 |
| Major — refresh 재시도 vs 즉시 리다이렉트 미구분 | 해소 | AC13에 refresh 재시도 후 실패 시 `/login` 리다이렉트 명시 |

---

## Critical

없음.

---

## Major

- [ ] **이력서 세부 항목 부분 입력 validation AC 없음**: 학력·경력·자격증·수상 항목은 AC1 Given에서 "하나라도 입력된 경우 API 호출"로 언급되지만, 각 항목 내 필수 필드(예: 학교명만 입력하고 졸업년도 미입력) 에러 케이스 AC가 없다. 테스트에서 validation 실패 분기를 커버할 수 없다.

---

## Minor

- [ ] **AC4 GET 실패(404 vs null) 분기**: `GET /api/essay-answers`가 404를 반환하는 경우와 null을 반환하는 경우 중 어느 쪽을 "없음"으로 처리할지 AC 본문에 명시되지 않고 협의 필요 항목으로만 남아 있다. 구현 시 핸들러 분기가 달라지므로 사람 확인 후 AC에 반영 권고.
- [ ] **AC8 GET 실패(404 vs null) 분기**: `GET /api/portfolios`도 동일한 이슈. portfolioId 없음 판단 기준이 협의 미확정 상태.
- [ ] **AC4 answer 포맷 직렬화 미확정**: 여러 문항 병합 방식(구분자 vs JSON)이 AC에 확정되지 않아 테스트 픽스처 작성 시 임의 선택이 필요하다. 확정 후 AC4 Then 절에 반영 권고.
- [ ] **AC1 이메일 자동 주입 여부 미명시**: Given에 "이메일" 항목이 포함되어 있으나 회원가입 시 수집된 값의 자동 주입인지 사용자 직접 입력인지 미명시.
- [ ] **AC9 허용 확장자·용량 기준 미명시**: "허용되지 않는 확장자", "허용 용량"이라 표기되어 있으나 구체적 값(예: PDF/ZIP, 20MB)은 Then 절 예시에만 괄호로 등장한다. Given 또는 사전 조건에 명확히 고정할 것을 권고.
- [ ] **AC12와 AC1/AC4/AC8 중복**: 각 AC에 "버튼 즉시 disabled" Then 절이 이미 있고 AC12가 같은 내용을 반복한다. 로딩 인디케이터 추가 명세는 AC12에만 있으므로 삭제보다는 AC12를 "인디케이터 표시"로 범위를 좁히는 것을 권고.
