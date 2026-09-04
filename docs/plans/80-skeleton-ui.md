# #80 스켈레톤 UI 추가

## User Story

**US1 (지원자 대시보드):** 지원자로서, 대시보드 진입 시 API 응답 전까지 레이아웃이 무너지지 않고 스켈레톤 UI가 표시되길 원한다. 왜냐하면 빈 화면은 오류처럼 보여 사용 경험을 해치기 때문이다.

**US2 (자기소개서 온보딩):** 지원자로서, 자기소개서 페이지 진입 시 기존 답변 로딩 중에도 입력 폼 영역이 스켈레톤으로 채워진 상태를 보고 싶다. 왜냐하면 빈 영역은 페이지가 깨진 것처럼 느껴지기 때문이다.

**US3 (포트폴리오 온보딩):** 지원자로서, 포트폴리오 페이지 진입 시 기존 데이터 로딩 중에 파일 업로드 및 링크 입력 영역이 스켈레톤으로 표시되길 원한다. 왜냐하면 컨텐츠 없이 빈 폼이 노출되면 혼란스럽기 때문이다.

**US4 (이력서 온보딩):** 지원자로서, 이력서 페이지 진입 시 기존 데이터 로딩 중에 각 섹션이 스켈레톤으로 채워진 상태를 보고 싶다. 왜냐하면 폼이 비어있는 채로 나타나면 입력해야 할 내용이 없는 것처럼 보이기 때문이다.

**US5 (기업 대시보드):** 기업 담당자로서, 대시보드의 채용공고 목록 영역도 로딩 중 스켈레톤이 표시되길 원한다. 왜냐하면 기업 요약·알림 카드에는 스켈레톤이 있지만 채용공고 목록만 빈 상태로 노출되어 일관성이 없기 때문이다.

## Acceptance Criteria

### AC1. 지원자 대시보드 — 로딩 중 스켈레톤 표시

- **Given:** 인증된 지원자가 `/applicant/dashboard`에 진입한다.
- **When:** `getApplicantProfileOverview()` API 요청이 진행 중(`isLoading === true`)이다.
- **Then:**
  - 기존 `<p>로딩 중...</p>` 텍스트 대신 `ProfileOverviewCard`, `HiringProcessCard`, `InterviewCallout` 각 영역의 형태를 본뜬 스켈레톤 컴포넌트가 렌더링된다.
  - 스켈레톤은 `animate-pulse` + `bg-bg-tertiary` 클래스를 사용하는 펄스 애니메이션을 적용한다.
  - 각 스켈레톤 섹션은 `aria-label="... 로딩 중"` 속성을 포함한다.
  - `<ReapplyNotice />`는 스켈레톤 표시 중에도 항상 렌더링된다.

### AC2. 지원자 대시보드 — API 완료 후 실제 컴포넌트 렌더링

- **Given:** 지원자 대시보드에서 스켈레톤이 표시되고 있다.
- **When:** `getApplicantProfileOverview()` 응답이 도착하여 `isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 `ProfileOverviewCard`, `HiringProcessCard`, `InterviewCallout` 실제 컴포넌트가 렌더링된다.
  - API 오류 시 기존 에러 메시지("프로필 정보를 불러오지 못했습니다...")가 표시된다.

### AC3. 자기소개서 온보딩 — 로딩 중 스켈레톤 표시

- **Given:** 인증된 지원자가 `/onboarding/cover-letter`에 진입한다.
- **When:** `getEssayAnswers()` API 요청이 진행 중(`isLoading === true`)이다.
- **Then:**
  - `CoverLetterQuestionField` 3개 영역을 대체하는 스켈레톤이 렌더링된다.
  - 각 스켈레톤 항목은 질문 제목 줄과 텍스트 영역 높이를 모방한 블록으로 구성된다.
  - "이전 단계", "나중에 작성", "다음" 버튼 전체가 `disabled` 상태를 유지한다.

### AC4. 자기소개서 온보딩 — API 완료 후 실제 컴포넌트 렌더링

- **Given:** 자기소개서 페이지에서 스켈레톤이 표시되고 있다.
- **When:** `getEssayAnswers()` 응답이 도착하여 `isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 `CoverLetterQuestionField` 3개가 렌더링된다.
  - 기존 데이터가 있으면 폼 필드에 값이 채워진다.
  - API 오류 시 스켈레톤이 제거되고 기존 코드의 catch 정책(빈 폼 유지)에 따라 빈 폼 상태로 표시된다.

### AC5. 포트폴리오 온보딩 — 로딩 중 스켈레톤 표시

- **Given:** 인증된 지원자가 `/onboarding/portfolio`에 진입한다.
- **When:** `getPortfolio()` API 요청이 진행 중(`isLoading === true`)이다.
- **Then:**
  - `FileUploadSection`과 `ExternalLinksSection` 영역을 대체하는 스켈레톤이 렌더링된다.
  - `AgreementSection` 전체를 `animate-pulse + bg-bg-tertiary` 스켈레톤 블록(체크박스 줄 + 문구 줄)으로 대체 렌더링한다.
  - "이전 단계", "나중에 작성", "제출" 버튼 전체가 `disabled` 상태를 유지한다.

### AC6. 포트폴리오 온보딩 — API 완료 후 실제 컴포넌트 렌더링

- **Given:** 포트폴리오 페이지에서 스켈레톤이 표시되고 있다.
- **When:** `getPortfolio()` 응답이 도착하여 `isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 `FileUploadSection`, `ExternalLinksSection`이 렌더링된다.
  - 기존 포트폴리오 데이터가 있으면 링크 필드와 기존 파일 정보가 채워진다.
  - API 오류 시 스켈레톤이 제거되고 기존 코드의 catch 정책(빈 폼 유지)에 따라 빈 폼 상태로 표시된다.

### AC7. 이력서 온보딩 — 로딩 중 스켈레톤 표시

- **Given:** 인증된 지원자가 `/onboarding/resume`에 진입한다.
- **When:** `getApplicantsAll()` API 요청이 진행 중(`isLoading === true`)이다.
- **Then:**
  - `PersonalInfoSection`, `EducationSection`, `CertificationSection`, `AwardSection`, `CareerSection` 각 영역을 대체하는 스켈레톤이 렌더링된다.
  - 각 섹션 스켈레톤은 섹션 제목 줄 + 입력 필드 줄 형태의 블록으로 구성된다.
  - "나중에 작성", "다음" 버튼 전체가 `disabled` 상태를 유지한다.

### AC8. 이력서 온보딩 — API 완료 후 실제 컴포넌트 렌더링

- **Given:** 이력서 페이지에서 스켈레톤이 표시되고 있다.
- **When:** `getApplicantsAll()` 응답이 도착하여 `isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 모든 섹션 컴포넌트가 렌더링된다.
  - 기존 데이터가 있으면 `reset()`을 통해 폼 필드에 값이 채워진다.
  - API 오류 시 스켈레톤이 제거되고 기존 코드의 catch 정책(빈 폼 유지)에 따라 빈 폼 상태로 표시된다.

### AC9. 기업 대시보드 — JobPostingList 로딩 중 스켈레톤 표시

- **Given:** 인증된 기업 담당자가 `/corporate/dashboard`에 진입한다.
- **When:** `getDashboardJobPostings()` API 요청이 진행 중(`jobPostings.isLoading === true`)이다.
- **Then:**
  - `JobPostingList` 영역에 채용공고 카드 형태를 모방한 스켈레톤이 렌더링된다.
  - 스켈레톤은 `CompanySummarySkeleton` / `NotificationSkeleton`과 동일한 `animate-pulse + bg-bg-tertiary` 패턴을 사용한다.
  - 스켈레톤 섹션에는 `aria-label="채용공고 로딩 중"` 속성을 포함한다.
  - `CorporateDashboardView`는 `jobPostings.isLoading === true` 조건을 `JobPostingList` 컴포넌트에 넘기거나 parent에서 조건부 스켈레톤을 렌더링하여 로딩 중 빈 상태("등록된 공고가 없습니다")가 표시되지 않도록 한다.

### AC10. 기업 대시보드 — API 완료 후 실제 JobPostingList 렌더링

- **Given:** 기업 대시보드에서 채용공고 스켈레톤이 표시되고 있다.
- **When:** `getDashboardJobPostings()` 응답이 도착하여 `jobPostings.isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 `JobPostingList` 컴포넌트가 실제 데이터(`jobPostings.data?.content`)로 렌더링된다.

## API 연동

| AC        | 메서드 | 엔드포인트                        | 용도                             |
| --------- | ------ | --------------------------------- | -------------------------------- |
| AC1, AC2  | GET    | `/api/applicants/document-status` | 문서 완성 여부 (progress 계산용) |
| AC1, AC2  | GET    | `/api/applicants`                 | 지원자 기본 정보 조회            |
| AC3, AC4  | GET    | `/api/essay-answers`              | 자기소개서 기존 답변 조회        |
| AC5, AC6  | GET    | `/api/portfolios`                 | 포트폴리오 기존 데이터 조회      |
| AC7, AC8  | GET    | `/api/applicants`                 | 이력서 전체 데이터 조회          |
| AC9, AC10 | GET    | `/api/dashboards/job-postings`    | 기업 채용공고 목록 조회          |

> **참고:** Swagger 스펙 서버(`https://api.piuda.site/v3/api-docs`)가 502 응답으로 접근 불가하여 소스 코드(`src/lib/onboarding-api.ts`, `src/services/corporate/dashboard.ts`)에서 직접 엔드포인트를 추출했습니다.

## 구현 참고

### 기존 스켈레톤 패턴 (`corporate-dashboard-view.tsx`)

```tsx
// 패턴: animate-pulse를 부모에, bg-bg-tertiary를 각 블록에 적용
<section aria-label="... 로딩 중">
  <div className="flex animate-pulse flex-col gap-3.5">
    <div className="bg-bg-tertiary h-7 w-40 rounded-md" />
    <div className="bg-bg-tertiary h-[70px] rounded-[10px]" />
  </div>
</section>
```

### 대상별 스켈레톤 구성 가이드

| 대상                         | 스켈레톤 블록 구성                                                     |
| ---------------------------- | ---------------------------------------------------------------------- |
| ProfileOverviewCard          | 프로필 이미지(원형) + 이름 줄 + 진행 상태 바 3개                       |
| HiringProcessCard            | 섹션 제목 줄 + 단계 카드 3~4개 (가로 배열)                             |
| InterviewCallout             | 아이콘 영역 + 텍스트 줄 2개 + 버튼 블록                                |
| CoverLetterQuestionField ×3  | 질문 번호 + 제목 줄 + 텍스트에리어 높이 블록 (3회 반복)                |
| FileUploadSection            | 점선 박스 형태 블록 (파일 드롭존 크기)                                 |
| ExternalLinksSection         | 레이블 줄 + 인풋 줄 3개                                                |
| AgreementSection             | 체크박스 줄 + 문구 줄 (animate-pulse + bg-bg-tertiary)                 |
| PersonalInfoSection          | 프로필 이미지 원형 + 입력 필드 줄 5개 (이름/이메일/전화/생년월일/주소) |
| EducationSection 외 4개 섹션 | 섹션 헤더 줄 + 입력 필드 줄 1개 (CLS 최소화: 기본 1항목 높이)          |
| JobPostingList               | 채용공고 카드 블록 3개 반복 (제목 줄 + 태그 줄 + 메타 정보 줄)         |

### 이력서/포트폴리오 페이지 — isLoading 상태 추가 필요

현재 `resume/page.tsx`와 `portfolio/page.tsx`에는 `isLoading` 상태가 없어 스켈레톤 조건 분기가 불가하다. 구현 시 아래 패턴으로 추가한다.

```tsx
const [isLoading, setIsLoading] = useState(true);

// loadPortfolio / loadApplicant 함수 finally 블록
.finally(() => { setIsLoading(false); });

// unmount 후 state update 방지: cancelled guard 필수
let cancelled = false;
loadData().finally(() => { if (!cancelled) setIsLoading(false); });
return () => { cancelled = true; };
```

## 컴포넌트 스펙

- **사용할 shadcn/ui 컴포넌트:** 별도 shadcn 컴포넌트 사용 없음 — Tailwind 유틸리티 클래스 직접 사용 (`animate-pulse`, `bg-bg-tertiary`, `rounded-*`)
- **상태 관리 필요 여부:** 각 페이지 컴포넌트의 로컬 `useState(isLoading)` 만으로 충분. 전역 상태 불필요.
- **접근성 주의사항:**
  - 모든 스켈레톤 `<section>` 또는 컨테이너에 `aria-label="[섹션명] 로딩 중"` 부여
  - 스켈레톤이 표시되는 동안 실제 인터랙티브 요소(버튼 등)는 `disabled` 처리하여 불필요한 포커스 이동 방지

## 향후 고려사항

- **전역 스켈레톤 컴포넌트 추상화:** 현재 각 페이지에 인라인으로 작성되는 스켈레톤을 `src/components/ui/skeleton.tsx` 기본 프리미티브로 추출하면 재사용성이 높아진다.
- **최소 표시 시간(min-display time):** API가 매우 빠를 경우 스켈레톤이 깜빡이는 문제가 발생할 수 있다. 필요 시 최소 300ms 표시 딜레이를 고려할 수 있다.
- **Stale-while-revalidate 패턴:** 캐시된 데이터가 있을 때는 스켈레톤 없이 즉시 렌더링하고 백그라운드 갱신하는 방향도 장기적으로 검토 가능하다.
- **이력서 섹션별 독립 로딩:** 현재 이력서 페이지는 `getApplicantsAll()` 단일 요청으로 전체를 로딩한다. 향후 섹션별 독립 API가 생긴다면 섹션 단위 스켈레톤 교체가 가능하다.

---

## 리뷰 결과

### 판정: PASS (조건부)

### Critical

- (없음)

### Major

- [ ] **AC5 Then 조건 미결정:** `AgreementSection`에 대해 "항상 표시된다(또는 스켈레톤 포함 여부는 구현 시 결정)"라는 표현이 포함되어 있다. AC는 테스트 코드 작성의 기준이 되어야 하므로, 구현 시점에 판단을 미루는 표현은 허용되지 않는다. "항상 표시된다" 또는 "스켈레톤으로 대체된다" 중 하나로 명확히 결정해야 한다.

### Minor

- [ ] AC2에는 API 오류 시 에러 메시지 표시 조건이 포함되어 있으나, AC4/AC6/AC8/AC10에는 동일한 오류 상태 기술이 없다. 프로젝트 AC 작성 원칙(해피 패스 + 크리티컬 에러만)을 일관되게 적용한다면 AC2의 에러 조항도 별도 AC로 분리하거나, 나머지 "완료" AC에도 동일하게 추가하는 방향으로 통일하는 것이 가독성에 유리하다.
- [ ] AC5/AC7의 When 문구가 "새로운 `isLoading` 상태가 `true`이다"로 표현되어 있어, AC1의 "API 요청이 진행 중(`isLoading === true`)이다"와 서술 방식이 다르다. 일관된 형식으로 통일을 권고한다.
