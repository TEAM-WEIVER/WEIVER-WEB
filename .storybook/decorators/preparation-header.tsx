import type { Decorator } from '@storybook/react-vite';

import { GlobalHeader, HeaderNavItem } from '@/components/common/global-header';
import { HeaderProfileButton } from '@/components/common/header-profile-button';

/** 실제 경로를 만들지 않는 지원 준비 페이지용 헤더 예시. */
export const withPreparationHeader: Decorator = (Story) => (
  <>
    <GlobalHeader
      navigation={['홈', '지원 준비', 'AI 면접', '역량 리포트'].map((label) => (
        <HeaderNavItem key={label} active={label === '지원 준비'} asChild>
          <button type="button">{label}</button>
        </HeaderNavItem>
      ))}
      profile={<HeaderProfileButton fullName="김민채" />}
    />
    <Story />
  </>
);
