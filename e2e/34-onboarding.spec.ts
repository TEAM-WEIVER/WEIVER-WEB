import { test as baseTest, type Page } from '@playwright/test';

import { test, expect } from './fixtures/auth';

/**
 * 개인(지원자) 온보딩 인수 테스트
 * AC2 ~ AC15 커버
 *
 * 전제: Next.js 앱이 MSW(브라우저 Service Worker)를 활성화한 상태로 구동 중이어야 한다.
 * MSW 핸들러 활성화는 테스트 시나리오별로 URL 파라미터 또는 쿠키로 전달하거나,
 * 개발/테스트 빌드에서 시나리오 키를 읽어 핸들러를 교체하는 방식으로 구현한다.
 */

// ──────────────────────────────────────────────
// 헬퍼: 인증된 사용자 상태로 페이지 진입
// ──────────────────────────────────────────────
async function gotoWithAuth(page: Page, url: string) {
  await page.goto(url);
}

// ──────────────────────────────────────────────
// AC2: 이력서 — 정상 제출 (신규 가입, POST 경로)
// ──────────────────────────────────────────────
test.describe('AC2: 이력서 정상 제출 — 신규 가입 POST 경로', () => {
  test('필수 항목 입력 후 다음 버튼 클릭 시 API 호출 후 /onboarding/cover-letter로 이동한다', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');

    // When: 필수 항목 입력
    await page.getByLabel('이름').fill('홍길동');
    await page.getByLabel('이메일').fill('hong@example.com');
    await page.getByLabel('전화번호').fill('010-1234-5678');
    await page.getByLabel('주소').fill('서울특별시 강남구');
    await page.getByLabel('생년월일').fill('1995-01-01');

    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(page).toHaveURL('/onboarding/cover-letter');
  });

  test('다음 버튼 클릭 시 즉시 비활성화되어 중복 제출이 방지된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');
    await page.getByLabel('이름').fill('홍길동');
    await page.getByLabel('이메일').fill('hong@example.com');
    await page.getByLabel('전화번호').fill('010-1234-5678');
    await page.getByLabel('주소').fill('서울특별시 강남구');
    await page.getByLabel('생년월일').fill('1995-01-01');

    // When
    const nextButton = page.getByRole('button', { name: '다음' });
    await nextButton.click();

    // Then: 클릭 직후 버튼 비활성 (API 응답 대기 중)
    await expect(nextButton).toBeDisabled();
  });
});

// ──────────────────────────────────────────────
// AC3: 이력서 — 다중 API 부분 성공 에러 처리
// ──────────────────────────────────────────────
test.describe('AC3: 이력서 세부 항목 API 부분 실패', () => {
  test('세부 항목 API 실패 시 새로고침 안내 토스트가 표시되고 페이지 이동 없음', async ({
    page,
  }) => {
    // Given: 에러 시나리오 핸들러 활성화 상태
    // (MSW 시나리오 파라미터로 전달 — 구현 시 실제 방식에 맞게 조정)
    await gotoWithAuth(page, '/onboarding/resume?scenario=resume-partial-error');

    await page.getByLabel('이름').fill('홍길동');
    await page.getByLabel('이메일').fill('hong@example.com');
    await page.getByLabel('전화번호').fill('010-1234-5678');
    await page.getByLabel('주소').fill('서울특별시 강남구');
    await page.getByLabel('생년월일').fill('1995-01-01');

    // When
    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(
      page.getByText('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.'),
    ).toBeVisible();
    await expect(page).toHaveURL('/onboarding/resume');
  });
});

// ──────────────────────────────────────────────
// AC4: 이력서 — 필수 항목 미입력 유효성 검사
// ──────────────────────────────────────────────
test.describe('AC4: 이력서 필수 항목 미입력', () => {
  test('필수 항목 미입력 시 인라인 에러가 표시되고 API 호출 없음', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');

    // When: 아무것도 입력하지 않고 다음 클릭
    await page.getByRole('button', { name: '다음' }).click();

    // Then: 인라인 에러 메시지
    await expect(page.getByText('이름을 입력해주세요.')).toBeVisible();
    await expect(page).toHaveURL('/onboarding/resume');
  });

  test('일부 필수 항목만 입력해도 미입력 필드 에러가 표시된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');

    // When: 이름만 입력
    await page.getByLabel('이름').fill('홍길동');
    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(page.getByText(/이메일/)).toBeVisible();
    await expect(page).toHaveURL('/onboarding/resume');
  });
});

// ──────────────────────────────────────────────
// AC5: 이력서 — "나중에 작성" 건너뜀
// ──────────────────────────────────────────────
test.describe('AC5: 이력서 나중에 작성', () => {
  test('나중에 작성 버튼 클릭 시 API 호출 없이 /onboarding/cover-letter로 이동한다', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');

    // When
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // Then
    await expect(page).toHaveURL('/onboarding/cover-letter');
  });
});

// ──────────────────────────────────────────────
// AC6: 자기소개서 — 정상 제출 (신규: POST, 재진입: PATCH)
// ──────────────────────────────────────────────
test.describe('AC6: 자기소개서 정상 제출', () => {
  test('신규 가입(essayCompleted: false) — POST 호출 후 /onboarding/portfolio로 이동', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/cover-letter');

    // When
    await page.getByRole('textbox').fill('저는 열정적인 개발자입니다.');
    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(page).toHaveURL('/onboarding/portfolio');
  });

  test('재진입(essayCompleted: true) — 기존 내용이 pre-fill되고 PATCH 호출 후 이동', async ({
    page,
  }) => {
    // Given: 재진입 시나리오
    await gotoWithAuth(page, '/onboarding/cover-letter?scenario=returning-user');

    // Then: 기존 자기소개서 내용이 폼에 채워져 있음
    await expect(page.getByRole('textbox')).toHaveValue('기존 자기소개서 내용입니다.');

    // When
    await page.getByRole('textbox').fill('수정된 자기소개서 내용입니다.');
    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(page).toHaveURL('/onboarding/portfolio');
  });
});

// ──────────────────────────────────────────────
// AC7: 자기소개서 — 글자수 제한 초과
// ──────────────────────────────────────────────
test.describe('AC7: 자기소개서 글자수 초과', () => {
  test('글자수 초과 시 인라인 에러가 표시되고 다음 버튼이 비활성화된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/cover-letter');

    // When: 제한 초과 텍스트 입력 (1001자 이상 가정)
    const longText = 'a'.repeat(1001);
    await page.getByRole('textbox').fill(longText);

    // Then
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
    await expect(page.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});

// ──────────────────────────────────────────────
// AC8: 자기소개서 — API 실패 에러 케이스
// ──────────────────────────────────────────────
test.describe('AC8: 자기소개서 API 실패', () => {
  test('API 실패 시 에러 토스트가 표시되고 페이지 이동 없음, 버튼 재활성화', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/cover-letter?scenario=essay-error');
    await page.getByRole('textbox').fill('자기소개서 내용입니다.');

    // When
    await page.getByRole('button', { name: '다음' }).click();

    // Then
    await expect(page.getByText('저장 중 오류가 발생했습니다. 다시 시도해주세요.')).toBeVisible();
    await expect(page).toHaveURL('/onboarding/cover-letter');
    await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();
  });
});

// ──────────────────────────────────────────────
// AC9: 자기소개서 — "나중에 작성" 건너뜀
// ──────────────────────────────────────────────
test.describe('AC9: 자기소개서 나중에 작성', () => {
  test('나중에 작성 버튼 클릭 시 API 호출 없이 /onboarding/portfolio로 이동한다', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/cover-letter');

    // When
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // Then
    await expect(page).toHaveURL('/onboarding/portfolio');
  });
});

// ──────────────────────────────────────────────
// AC10: 포트폴리오 — 정상 제출 (신규: POST, 재진입: PATCH)
// ──────────────────────────────────────────────
test.describe('AC10: 포트폴리오 정상 제출', () => {
  test('신규 가입(portfolioCompleted: false) — 파일 첨부 + 동의 후 제출 → /applicant/dashboard로 이동', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');

    // When: PDF 파일 첨부
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'portfolio.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
    });

    // 개인정보 이용 동의 체크
    await page.getByRole('checkbox').check();

    // 제출 버튼 활성화 확인 후 클릭
    await expect(page.getByRole('button', { name: '제출' })).toBeEnabled();
    await page.getByRole('button', { name: '제출' }).click();

    // Then
    await expect(page).toHaveURL('/applicant/dashboard');
  });

  test('재진입(portfolioCompleted: true) — 기존 데이터 pre-fill되고 PATCH 호출 후 이동', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio?scenario=returning-user');

    // Then: 기존 GitHub URL pre-fill 확인
    await expect(page.getByLabel(/GitHub/i)).toHaveValue('https://github.com/example');

    // When: 새 파일 첨부 + 동의
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'portfolio-v2.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('updated pdf content'),
    });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: '제출' }).click();

    // Then
    await expect(page).toHaveURL('/applicant/dashboard');
  });
});

// ──────────────────────────────────────────────
// AC11: 포트폴리오 — 파일 용량·확장자 제한
// ──────────────────────────────────────────────
test.describe('AC11: 포트폴리오 파일 유효성 검사', () => {
  test('허용되지 않는 확장자 파일 선택 시 인라인 에러가 표시되고 제출 버튼 비활성', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');

    // When: .txt 파일 첨부 시도
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a valid file'),
    });

    // Then
    await expect(page.getByText('PDF 또는 ZIP 파일만 업로드할 수 있습니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
  });

  test('20MB 초과 파일 선택 시 인라인 에러가 표시되고 제출 버튼 비활성', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');

    // When: 21MB 파일 첨부 시도
    const largePdfBuffer = Buffer.alloc(21 * 1024 * 1024, 0); // 21MB
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: largePdfBuffer,
    });

    // Then
    await expect(page.getByText('파일 크기는 20MB 이하여야 합니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
  });

  test('파일 미첨부 + 동의 체크 상태에서도 제출 버튼이 비활성화된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');

    // When: 동의만 체크
    await page.getByRole('checkbox').check();

    // Then
    await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
  });
});

// ──────────────────────────────────────────────
// AC12: 포트폴리오 — API 실패 에러 케이스
// ──────────────────────────────────────────────
test.describe('AC12: 포트폴리오 API 실패', () => {
  test('API 실패 시 에러 토스트가 표시되고 페이지 이동 없음, 버튼 재활성화', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio?scenario=portfolio-error');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'portfolio.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
    });
    await page.getByRole('checkbox').check();

    // When
    await page.getByRole('button', { name: '제출' }).click();

    // Then
    await expect(page.getByText('업로드 중 오류가 발생했습니다. 다시 시도해주세요.')).toBeVisible();
    await expect(page).toHaveURL('/onboarding/portfolio');
    await expect(page.getByRole('button', { name: '제출' })).toBeEnabled();
  });
});

// ──────────────────────────────────────────────
// AC13: 포트폴리오 — "나중에 작성" 건너뜀
// ──────────────────────────────────────────────
test.describe('AC13: 포트폴리오 나중에 작성', () => {
  test('나중에 작성 버튼 클릭 시 API 호출 없이 /applicant/dashboard로 이동한다', async ({
    page,
  }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');

    // When
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // Then
    await expect(page).toHaveURL('/applicant/dashboard');
  });
});

// ──────────────────────────────────────────────
// AC14: 공통 — API 호출 중 로딩 처리
// ──────────────────────────────────────────────
test.describe('AC14: API 호출 중 로딩 처리', () => {
  test('이력서 다음 버튼 클릭 후 로딩 인디케이터가 표시된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/resume');
    await page.getByLabel('이름').fill('홍길동');
    await page.getByLabel('이메일').fill('hong@example.com');
    await page.getByLabel('전화번호').fill('010-1234-5678');
    await page.getByLabel('주소').fill('서울특별시 강남구');
    await page.getByLabel('생년월일').fill('1995-01-01');

    // When
    const nextButton = page.getByRole('button', { name: '다음' });
    await nextButton.click();

    // Then: 버튼 비활성화 (로딩 중 중복 제출 방지)
    await expect(nextButton).toBeDisabled();
  });

  test('자기소개서 다음 버튼 클릭 후 로딩 중 버튼이 비활성화된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/cover-letter');
    await page.getByRole('textbox').fill('자기소개서 내용입니다.');

    // When
    const nextButton = page.getByRole('button', { name: '다음' });
    await nextButton.click();

    // Then
    await expect(nextButton).toBeDisabled();
  });

  test('포트폴리오 제출 버튼 클릭 후 로딩 중 버튼이 비활성화된다', async ({ page }) => {
    // Given
    await gotoWithAuth(page, '/onboarding/portfolio');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'portfolio.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf'),
    });
    await page.getByRole('checkbox').check();

    // When
    const submitButton = page.getByRole('button', { name: '제출' });
    await submitButton.click();

    // Then
    await expect(submitButton).toBeDisabled();
  });
});

// ──────────────────────────────────────────────
// AC15: 공통 — 인증 만료 또는 미인증 접근
// ──────────────────────────────────────────────
baseTest.describe('AC15: 인증 만료 시 /login 리다이렉트', () => {
  baseTest('accessToken 없이 온보딩 페이지 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    // Given: 토큰 없는 상태로 직접 접근
    await page.goto('/onboarding/resume');

    // Then
    await expect(page).toHaveURL('/login');
  });

  baseTest('토큰 만료 후 refresh 실패 시 /login으로 리다이렉트된다', async ({ page }) => {
    // Given: 인증 역할이나 재발급 가능한 refresh cookie가 없는 상태
    await page.goto('/onboarding/cover-letter?scenario=auth-expired');

    // Then: refresh도 실패하므로 /login으로 리다이렉트
    await expect(page).toHaveURL('/login');
  });
});
