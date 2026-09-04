# 코드 리뷰 — #77 not-found.tsx

## 판정: PASS

## Critical

없음

## Major

없음

## Minor

- `src/app/not-found.tsx:12` — `404` 숫자 텍스트가 `<p>` 태그로 마크업됨. 시각적으로 대형 강조 요소이나 의미상 `<span>` 또는 `<p aria-hidden="true">`가 더 명확할 수 있음. 스크린 리더는 이미 `<h1>`을 통해 오류를 인식하므로, 접근성 측면에서 aria-hidden 추가를 고려할 수 있음 (필수 아님).
- `src/app/not-found.tsx:5-7` — metadata에 `description`이 없음. SEO 관점에서 404 페이지에도 간단한 description 추가를 고려할 수 있으나 필수 요건은 아님.
