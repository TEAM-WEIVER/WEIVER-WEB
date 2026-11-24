import { setupWorker } from 'msw/browser';

import { homeHandlers } from './handlers/home';

export async function startMockApi() {
  const worker = setupWorker(...homeHandlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  const banner = document.createElement('div');
  banner.textContent = '개발용 mock API · 이 탭의 테스트 데이터만 사용합니다.';
  banner.className = 'bg-amber-50 text-amber-900 text-sm px-4 py-2 text-center';
  banner.dataset.testid = 'mock-api-banner';
  document.body.prepend(banner);
}
