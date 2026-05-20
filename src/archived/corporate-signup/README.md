# Corporate Signup Archive

보관일: 2026-05-20

기업 회원가입은 웹 서비스에서 더 이상 제공하지 않지만, 기존 구현을 참고하거나 복구할 수 있도록 이 폴더에 보관한다.

## 보관 내용

- `pages/account-page.tsx.archive`: 기업/개인 분기를 포함하던 계정 입력 page 스냅샷
- `pages/company-info-page.tsx.archive`: 기업 전용 회사 정보 입력 page
- `pages/terms-page.tsx.archive`: 기업/개인 분기를 포함하던 약관 page 스냅샷
- `pages/complete-page.tsx.archive`: 기업/개인 완료 page 스냅샷
- `pages/profile-page.tsx.archive`: 기업/개인 프로필 page 스냅샷
- `tests/*.archive`: 기업 회원가입 플로우 테스트 스냅샷

## 현재 서비스 정책

- 기업 회원가입 라우트는 active app route에서 사용하지 않는다.
- 기업 계정은 외부 또는 관리자 절차로 발급하는 전제로 둔다.
- 기업 사용자는 `/login`의 기업 회원 탭에서 로그인한다.

## 복구 시 확인할 항목

- 기업 회원가입 API 스펙
- 기업 이메일 인증 정책
- 기업 약관 payload 매핑
- 기업 가입 완료 후 이동 경로
- 개인 전용으로 바뀐 `src/app/signup` route 구조
