# [#100] 구직자 프로필·온보딩 API 스펙 반영

## 배경

현재 코드베이스의 주요 불일치 사항:

1. `applicant-profile-api.ts`가 `GET /api/applicants/document-status`를 호출 중이지만 최신 스펙에는 해당 엔드포인트가 없고 `GET /api/applicants/submission-status`로 대체됨
2. `submission-status` 응답에 `submitted`, `syncStatus`, `submittable` 필드가 추가됨 — 대시보드 진행 상태 표시와 제출 버튼 활성화에 영향
3. 포트폴리오 저장 후 `/applicant/dashboard`로 이동하지만 `POST /api/applicants/profile/submit` 호출이 연결되어 있지 않음
4. `WorkExperienceDTO` 응답에 `isRecognized` 필드가 있음에도 타입 정의에 optional 처리 — 안전하지 않음
5. `onboarding-api.ts`의 `patchPortfolio` 함수가 portfolioId를 path param으로 받는 것은 스펙과 일치하나, GET 응답의 null 케이스가 명시적으로 처리되지 않음

---

## User Story

### US1. 이력서 저장 (Snapshot PUT)

**US:** 구직자로서, 학력·경력·자격증·수상 이력을 편집하고 저장할 때 삭제한 항목이 서버에도 반영되길 원한다. 왜냐하면 화면에서 항목을 지웠는데 서버에 여전히 남아 있으면 AI 프로필 분석 결과가 잘못되기 때문이다.

### US2. 자기소개서 저장

**US:** 구직자로서, 3개 문항의 자기소개서를 처음 작성하거나 수정할 때 올바른 API(POST/PUT)가 호출되길 원한다. 왜냐하면 최초 저장과 수정 시 호출 방식이 달라 잘못 호출하면 서버 오류가 발생하기 때문이다.

### US3. 포트폴리오 저장

**US:** 구직자로서, 포트폴리오를 처음 등록하거나 수정할 때 올바른 API(POST/PATCH)가 호출되길 원한다. 왜냐하면 포트폴리오 ID 유무에 따라 엔드포인트가 다르기 때문이다.

### US4. 프로필 제출 및 AI 동기화

**US:** 구직자로서, 이력서·자기소개서·포트폴리오를 모두 완성한 후 프로필을 제출하면 AI 프로필 분석이 시작됨을 알고 싶다. 왜냐하면 제출 완료 후 AI가 내 프로필을 분석한다는 것을 확인해야 안심하고 채용 과정을 기다릴 수 있기 때문이다.

### US5. 대시보드 진행 상태 표시

**US:** 구직자로서, 대시보드에서 이력서·자기소개서·포트폴리오 작성 완료 여부와 프로필 제출 상태를 정확하게 확인하고 싶다. 왜냐하면 어떤 항목이 미완성인지 한눈에 파악해야 빠르게 완성할 수 있기 때문이다.

---

## Acceptance Criteria

### AC1-a. 이력서 Snapshot PUT — 기존 데이터 있을 때 저장

- **Given:** 서버에 학력/경력/자격증/수상 데이터가 1건 이상 저장된 상태(각 항목에 서버 발급 id가 존재)에서, 사용자가 항목을 수정하고 "다음" 버튼을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - 화면에 남아 있는 유효한 항목 전체를 `PUT` 요청의 배열(EducationUpdateDTO / WorkExperienceUpdateDTO / CertificateUpdateDTO / AwardUpdateDTO)로 전송한다
  - 삭제된 항목은 배열에서 제외되어 서버에서 자동 삭제된다
  - 모든 `PUT` 요청이 성공하면 다음 온보딩 단계로 이동한다

### AC1-b. 이력서 Snapshot POST — 초기 저장 (서버 데이터 없음)

- **Given:** 서버에 저장된 이력서 데이터가 없는 초기 상태(id 없음)에서, 사용자가 신규 항목을 1개 이상 입력하고 "다음" 버튼을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - 화면에 입력된 항목 전체를 `POST` 요청의 배열(EducationDTO / WorkExperienceDTO / CertificateDTO / AwardDTO)로 전송한다
  - 요청 배열에 id 필드를 포함하지 않는다
  - 모든 `POST` 요청이 성공하면 다음 온보딩 단계로 이동한다

### AC2. 이력서 저장 실패 시 폼 복구

- **Given:** 이력서 저장 중 하나 이상의 서브 요청(education/experience/certificate/award)이 실패한다
- **When:** `Promise.allSettled`로 결과를 수집한다
- **Then:**
  - 서버에서 최신 데이터를 재조회(`GET /api/applicants`)하여 폼을 서버 상태로 리셋한다
  - 에러 메시지 "오류가 발생했습니다. 다시 시도해주세요."를 화면에 표시한다
  - 재조회도 실패할 경우 "오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요."를 표시한다

### AC3. 자기소개서 최초 저장 (POST)

- **Given:** 서버에 자기소개서 답변이 없는 상태(`GET /api/essay-answers` 응답의 answers 배열이 비어 있어 answerId가 존재하지 않음)에서, 사용자가 3개 문항을 모두 작성하고 "다음"을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - `POST /api/essay-answers`에 `{ answers: [{ questionId, answer }] }` 형식으로 3건을 전송한다
  - 성공 시 다음 온보딩 단계로 이동한다

### AC4. 자기소개서 수정 저장 (PUT)

- **Given:** 서버에 자기소개서 답변이 이미 저장된 상태(`GET /api/essay-answers` 응답의 answers 배열에 answerId가 존재)에서, 사용자가 내용을 수정하고 "다음"을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - `PUT /api/essay-answers`에 `{ answers: [{ answerId, answer }] }` 형식으로 3건을 전송한다
  - 성공 시 다음 온보딩 단계로 이동한다

### AC5. 자기소개서 저장 실패

- **Given:** 자기소개서 저장 API 호출 중 네트워크/서버 오류가 발생한다
- **When:** 응답이 에러로 반환된다
- **Then:**
  - 에러 메시지 "저장 중 오류가 발생했습니다. 다시 시도해주세요."를 화면에 표시한다
  - 페이지 이동 없이 현재 단계에 머문다

### AC6. 포트폴리오 최초 저장 (POST)

- **Given:** 서버에 포트폴리오가 없는 상태(portfolioId = null)에서, 사용자가 파일 또는 링크를 입력하고 "제출"을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - `POST /api/portfolios`에 `multipart/form-data`(requestDTO + portfolio 파일)를 전송한다
  - 포트폴리오 저장 성공 직후 `POST /api/applicants/profile/submit`을 자동으로 호출한다
  - 프로필 제출 성공 시 `/applicant/dashboard`로 이동한다

### AC7. 포트폴리오 수정 저장 (PATCH)

- **Given:** 서버에 포트폴리오가 이미 저장된 상태(portfolioId != null)에서, 사용자가 내용을 수정하고 "제출"을 누른다
- **When:** 폼 제출이 실행된다
- **Then:**
  - `PATCH /api/portfolios/{portfolioId}`에 `multipart/form-data`를 전송한다
  - 포트폴리오 저장 성공 직후 `POST /api/applicants/profile/submit`을 자동으로 호출한다
  - 프로필 제출 성공 시 `/applicant/dashboard`로 이동한다

### AC8. 포트폴리오 저장 실패

- **Given:** 포트폴리오 저장 API 호출 중 오류가 발생한다
- **When:** 응답이 에러로 반환된다
- **Then:**
  - 에러 메시지 "업로드 중 오류가 발생했습니다. 다시 시도해주세요."를 화면에 표시한다
  - 페이지 이동 없이 현재 단계에 머문다
  - `POST /api/applicants/profile/submit`을 호출하지 않는다

### AC9. 대시보드 진행 상태 조회 — submission-status 전환

- **Given:** 사용자가 `/applicant/dashboard`에 접근한다
- **When:** 페이지가 마운트되면 프로필 오버뷰를 로드한다
- **Then:**
  - `GET /api/applicants/document-status` 대신 `GET /api/applicants/submission-status`를 호출한다
  - 응답의 `resumeCompleted` (boolean) → 이력서 완료 여부 표시에 매핑한다
  - 응답의 `essayCompleted` (boolean) → 자기소개서 완료 여부 표시에 매핑한다
  - 응답의 `portfolioCompleted` (boolean) → 포트폴리오 완료 여부 표시에 매핑한다
  - `submitted` (boolean), `syncStatus` (enum: PENDING | REQUESTED | COMPLETED | FAILED), `submittable` (boolean) 필드를 `ApplicantProfileOverview` 타입에 추가하여 대시보드 컴포넌트에서 활용 가능하게 한다

### AC10. 대시보드 진행 상태 조회 실패

- **Given:** `GET /api/applicants/submission-status` 호출 중 오류가 발생한다
- **When:** 응답이 에러로 반환된다
- **Then:**
  - `overview`를 null로 설정하고 `hasOverviewError`를 true로 설정한다
  - 화면에 "프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." 메시지를 표시한다

### AC11. 프로필 제출 후 AI 동기화 상태 폴링

- **Given:** 포트폴리오 저장 후 `POST /api/applicants/profile/submit`이 성공하여 대시보드로 이동한다
- **When:** 대시보드 마운트 시 `GET /api/applicants/submission-status`를 조회한 결과 `syncStatus === 'REQUESTED'`이다
- **Then:**
  - AI 분석 진행 중 상태를 UI에 즉시 표시한다(`syncStatus` 기반 상태 배지)
  - 10초 후 `GET /api/applicants/submission-status`를 1회 재조회한다
  - 여전히 `REQUESTED`이면 20초 후(최초 기준) 1회 더 재조회한다
  - 2회 재조회 후에도 `REQUESTED`이면 폴링을 중단하고 화면에 "AI 분석이 지연되고 있습니다. 잠시 후 새로고침 해주세요." 안내를 표시한다
  - `COMPLETED` 또는 `FAILED`로 전환되면 즉시 폴링을 중단하고 해당 상태를 UI에 반영한다

### AC12-a. 프로필 제출 불가 — 이미 제출된 상태

- **Given:** `GET /api/applicants/submission-status` 응답에서 `submitted === true` 또는 `submittable === false`이다
- **When:** 대시보드가 렌더링된다
- **Then:**
  - 제출 관련 버튼/안내가 이미 제출된 상태임을 나타내는 `syncStatus` 기반 상태 배지로 대체된다
  - `POST /api/applicants/profile/submit` 요청이 발생하지 않는다

### AC12-b. 프로필 제출 실패 — API 오류 반환

- **Given:** 포트폴리오 저장 성공 직후 `POST /api/applicants/profile/submit`이 오류(예: `PROFILE_ALREADY_SUBMITTED` 또는 서버 오류)를 반환한다
- **When:** 오류 응답이 수신된다
- **Then:**
  - 에러 메시지 "제출 중 오류가 발생했습니다. 다시 시도해주세요."를 화면에 표시한다
  - 페이지 이동 없이 포트폴리오 페이지에 머문다

---

## API 연동

| AC      | 메서드 | 엔드포인트                        | 요청                                                                                                                                   | 응답                                                                                                                                                                              |
| ------- | ------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1-a   | PUT    | /api/applicants/education         | `{ EducationUpdateDTO: [{ educationId, degreeType, schoolName, major, gpa, startDate, endDate, status }] }`                            | ApiResponseVoid                                                                                                                                                                   |
| AC1-b   | POST   | /api/applicants/education         | `{ EducationDTO: [{ degreeType, schoolName, major, gpa, startDate, endDate, status }] }`                                               | ApiResponseVoid                                                                                                                                                                   |
| AC1-a   | PUT    | /api/applicants/experience        | `{ WorkExperienceUpdateDTO: [{ workExperienceId, companyName, startDate, endDate, employmentType, position, duties, isRecognized }] }` | ApiResponseVoid                                                                                                                                                                   |
| AC1-b   | POST   | /api/applicants/experience        | `{ WorkExperienceDTO: [{ companyName, startDate, endDate, employmentType, position, duties, isRecognized }] }`                         | ApiResponseVoid                                                                                                                                                                   |
| AC1-a   | PUT    | /api/applicants/certificate       | `{ CertificateUpdateDTO: [{ certificateId, certificateName, acquisitionDate, issuer }] }`                                              | ApiResponseVoid                                                                                                                                                                   |
| AC1-b   | POST   | /api/applicants/certificate       | `{ CertificateDTO: [{ certificateName, acquisitionDate, issuer }] }`                                                                   | ApiResponseVoid                                                                                                                                                                   |
| AC1-a   | PUT    | /api/applicants/award             | `{ AwardUpdateDTO: [{ awardId, awardName, awardDate, issuer }] }`                                                                      | ApiResponseVoid                                                                                                                                                                   |
| AC1-b   | POST   | /api/applicants/award             | `{ AwardDTO: [{ awardName, awardDate, issuer }] }`                                                                                     | ApiResponseVoid                                                                                                                                                                   |
| AC1-a/b | PUT    | /api/applicants/info              | `multipart/form-data: requestDTO(name, email, phoneNumber, address, birthday) + profileImage?`                                         | ApiResponseVoid                                                                                                                                                                   |
| AC2     | GET    | /api/applicants                   | -                                                                                                                                      | ApplicantInfoResponseDTO (ApplicantDTO, EducationDTO[], WorkExperienceDTO[], CertificateDTO[], AwardDTO[])                                                                        |
| AC3     | POST   | /api/essay-answers                | `{ answers: [{ questionId, answer }] }` (3건)                                                                                          | ApiResponseVoid                                                                                                                                                                   |
| AC4     | PUT    | /api/essay-answers                | `{ answers: [{ answerId, answer }] }` (3건)                                                                                            | ApiResponseVoid                                                                                                                                                                   |
| AC3/4   | GET    | /api/essay-answers                | -                                                                                                                                      | `{ answers: [{ answerId, questionId, sequence, question, maxLength, answer }] }`                                                                                                  |
| AC6     | POST   | /api/portfolios                   | `multipart/form-data: requestDTO(urlGithub?, urlTech?, urlEtc?) + portfolio?`                                                          | ApiResponseVoid                                                                                                                                                                   |
| AC7     | PATCH  | /api/portfolios/{portfolioId}     | `multipart/form-data: requestDTO(urlGithub?, urlTech?, urlEtc?) + portfolio?`                                                          | ApiResponseVoid                                                                                                                                                                   |
| AC6/7   | GET    | /api/portfolios                   | -                                                                                                                                      | `{ portfolioId, downloadUrl, fileName, fileType, fileSize, urlGithub, urlTech, urlEtc }`                                                                                          |
| AC6/7   | POST   | /api/applicants/profile/submit    | -                                                                                                                                      | ApiResponseVoid                                                                                                                                                                   |
| AC9/11  | GET    | /api/applicants/submission-status | -                                                                                                                                      | `{ submitted: boolean, syncStatus: PENDING\|REQUESTED\|COMPLETED\|FAILED, submittable: boolean, resumeCompleted: boolean, essayCompleted: boolean, portfolioCompleted: boolean }` |

> 빈 배열 전송은 클라이언트 Zod 유효성 검사로 사전 차단됨 (필수 항목에 .required() 옵션 적용으로 폼 제출 자체가 막힘)

---

## 컴포넌트 스펙

**변경 대상 파일:**

- `src/lib/onboarding-api.ts`
  - `getDocumentStatus` 함수를 `getSubmissionStatus`로 교체
  - `DocumentStatus` 인터페이스에 `submitted`, `syncStatus`, `submittable` 필드 추가
  - `postProfileSubmit` 함수 추가: `POST /api/applicants/profile/submit`
  - `WorkExperienceUpdateDTO.isRecognized`를 optional이 아닌 required로 강화 (기존에는 optional이었음 — AC1 Snapshot 방식과 일관성 필요)

- `src/lib/applicant-profile-api.ts`
  - `getDocumentStatus()` → `getSubmissionStatus()` 호출로 교체
  - `ApplicantProfileOverview`에 `submitted`, `syncStatus`, `submittable` 필드 추가

- `src/app/onboarding/portfolio/page.tsx` (또는 포트폴리오 저장 담당 컴포넌트)
  - 포트폴리오 저장 성공 직후 `POST /api/applicants/profile/submit` 자동 호출 연결

- `src/app/applicant/dashboard/page.tsx`
  - `overview.submitted`, `overview.syncStatus`, `overview.submittable` 기반 UI 분기 추가
  - `syncStatus === 'REQUESTED'` 시 폴링 로직(10초 간격, 최대 2회) 연결
  - AI 분석 진행 중/완료/실패 상태 표시

**사용할 shadcn/ui 컴포넌트:**

- `Button` — 제출 버튼 (disabled/aria-busy 상태 관리)
- `Badge` 또는 inline 텍스트 — syncStatus 표시 (`PENDING` / `REQUESTED` / `COMPLETED` / `FAILED`)

**상태 관리 필요 여부:**

- 대시보드 `overview` 상태에 `submitted`, `syncStatus`, `submittable` 추가 (로컬 useState로 충분)
- `syncStatus === 'REQUESTED'` 진입 시 `useEffect` + `setTimeout` 기반 폴링(10초, 20초, 최대 2회)

**접근성 주의사항:**

- 포트폴리오 제출 버튼: `aria-busy={isSubmitting}` (포트폴리오 저장 + 프로필 제출 진행 중)
- syncStatus 변경 시 스크린 리더에 알림: `role="status"` 또는 `aria-live="polite"` 영역 사용

---

## 향후 고려사항

- 프로필 제출 후 `syncStatus === 'FAILED'`일 때 재제출 가능 여부 및 UI 처리 방식
- `PROFILE_ALREADY_SUBMITTED` 오류 코드 외 제출 실패 유형(네트워크 오류 등) 에러 분기 처리
- 이력서 저장 시 항목을 전부 삭제한 채로 저장하는 시나리오 처리 — 빈 배열 전송은 클라이언트 Zod 유효성 검사로 사전 차단됨 (필수 항목에 .required() 옵션 적용으로 폼 제출 자체가 막힘)
- 포트폴리오 `GET` 실패 시 `portfolioId`가 null로 유지되어 PATCH 대신 POST가 호출되는 안전 장치가 현재 코드에 이미 존재하나, 동일 사용자가 여러 탭에서 동시 편집하는 경쟁 조건은 미처리
- 자기소개서 `answerId` 누락 시 PUT에서 POST로 폴백하는 현재 로직(`essayCompletedRef.current && answerIdsRef.current.length === 0` 분기)이 스펙 변경 후에도 유효한지 재검토
- 대시보드에 별도 프로필 제출 버튼을 노출하는 흐름 — 현재는 포트폴리오 저장 시 자동 제출로 결정되었으나, 향후 재제출 시나리오에서 필요할 수 있음
