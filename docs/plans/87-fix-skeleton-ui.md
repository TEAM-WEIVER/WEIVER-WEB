# [#87] 스켈레톤 UI 잔여 AC 완료 (JobPostingList)

## User Story

US: 기업 담당자로서, 채용공고 목록이 로딩 중일 때 스켈레톤 UI를 보고 싶다. 왜냐하면 빈 "등록된 공고가 없습니다" 메시지와 실제 로딩 상태를 구분하지 못하면 혼란이 발생하기 때문이다.

## Acceptance Criteria

### AC9. 기업 대시보드 — JobPostingList 로딩 중 스켈레톤 표시

- **Given:** 인증된 기업 담당자가 `/corporate/dashboard`에 진입한다.
- **When:** `getDashboardJobPostings()` API 요청이 진행 중(`jobPostings.isLoading === true`)이다.
- **Then:**
  - `JobPostingList` 영역 대신 채용공고 카드 형태를 모방한 `JobPostingListSkeleton`이 렌더링된다.
  - 스켈레톤은 `CompanySummarySkeleton` / `NotificationSkeleton`과 동일한 `animate-pulse + bg-bg-tertiary` 패턴을 사용한다.
  - 스켈레톤 섹션에는 `aria-label="채용공고 로딩 중"` 속성이 포함된다.
  - `jobPostings.isLoading === true` 조건일 때 `JobPostingList`가 렌더링되지 않아 빈 상태("등록된 공고가 없습니다")가 표시되지 않는다.

### AC10. 기업 대시보드 — API 완료 후 실제 JobPostingList 렌더링

- **Given:** 기업 대시보드에서 채용공고 스켈레톤(`JobPostingListSkeleton`)이 표시되고 있다.
- **When:** `getDashboardJobPostings()` 응답이 도착하여 `jobPostings.isLoading === false`가 된다.
- **Then:**
  - 스켈레톤이 제거되고 `JobPostingList` 컴포넌트가 실제 데이터(`jobPostings.data?.content`)로 렌더링된다.
  - 데이터가 빈 배열인 경우 "등록된 공고가 없습니다" 빈 상태 메시지가 정상 표시된다.

## API 연동

| AC        | 메서드 | 엔드포인트                     | 요청                          | 응답                                     |
| --------- | ------ | ------------------------------ | ----------------------------- | ---------------------------------------- |
| AC9, AC10 | GET    | `/api/dashboards/job-postings` | `{ page: 0, size: 3 }` (쿼리) | `{ content: JobPostingsDetails[], ... }` |

> **참고:** Swagger 스펙 조회 실패로 응답 스키마는 기존 코드(`useDashboardJobPostings`, `JobPostingsDetails` 타입)를 기준으로 작성했습니다. 엔드포인트 매핑 및 응답 필드는 아래 사람 검증 섹션에서 확인 바랍니다.

## 구현 참고 — JobPostingListSkeleton 블록 구성 가이드

실제 `JobPostingList` 레이아웃을 기준으로 아래 세 영역을 스켈레톤으로 대체한다.

### 1. 헤더 영역 (높이 약 98px)

```
제목 텍스트 블록 (w-28, h-7)
설명 텍스트 블록 (w-52, h-4)
필터 탭 블록 (w-[336px], h-[58px], rounded-lg)
새 공고 작성 버튼 블록 (w-[108px], h-[42px], rounded-[10px])
```

### 2. 카드 목록 영역 (카드 3개 반복, 각 min-h-[108px])

```
각 카드:
  왼쪽: 제목 블록 (h-6, w-2/3) + 상태 태그 블록 (w-16, h-5) / 직무 블록 (h-4, w-1/2)
  오른쪽: 새로운 지원자 박스 블록 (w-16, h-[58px], rounded-lg) + 메뉴 버튼 블록 (size-6)
```

### 3. 푸터 영역 (h-12)

```
"공고 리스트 더보기" 텍스트 블록 (w-32, h-4) + 아이콘 블록 (size-6)
```

### 컴포넌트 위치

`src/app/corporate/dashboard/_components/corporate-dashboard-view.tsx` 내부에 `JobPostingListSkeleton` 함수 컴포넌트를 추가한다. 기존 `CompanySummarySkeleton`, `NotificationSkeleton`과 동일한 파일 내 위치 패턴을 따른다.

### 조건부 렌더링 변경

```tsx
// Before
<JobPostingList postings={jobPostings.data?.content ?? []} />;

// After
{
  jobPostings.isLoading ? (
    <JobPostingListSkeleton />
  ) : (
    <JobPostingList postings={jobPostings.data?.content ?? []} />
  );
}
```

## 컴포넌트 스펙

- 사용할 shadcn/ui 컴포넌트: 없음 (순수 Tailwind div 블록)
- 상태 관리 필요 여부: 없음 (`jobPostings.isLoading`은 기존 `useDashboardJobPostings` 훅에서 제공)
- 접근성 주의사항: `<section aria-label="채용공고 로딩 중">` 래퍼 필수, 스켈레톤 내부 인터랙티브 요소 없음

## 향후 고려사항

- 네트워크 지연이 길 경우 스켈레톤 카드 개수(현재 3개 고정)를 동적으로 조정하는 방안
- `jobPostings.isError` 상태에 대한 에러 UI (현재 미정의, 빈 상태로 폴백됨)
- 필터 탭 인터랙션 구현 (현재 `JobPostingList`에서도 UI만 존재, 기능 미구현)
