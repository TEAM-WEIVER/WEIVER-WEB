import type { Preview } from '@storybook/react-vite';
import { sb } from 'storybook/test';

import 'pretendard/dist/web/variable/pretendardvariable.css';
import '../src/styles/globals.css';

// 인증 스토리는 운영 로그아웃/토큰 재발급 API를 호출하지 않는다.
sb.mock(import('../src/lib/auth-api.ts'));

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'error',
    },
  },
};

export default preview;
