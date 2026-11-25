import { ArgTypes, Description, Primary, Title } from '@storybook/addon-docs/blocks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect } from 'storybook/test';

import { GlobalHeader } from './global-header';
import { HeaderProfileMenu } from './header-profile-menu';
import { MemberHeaderNavigation } from './member-header-navigation';
import { PageLoadingOverlay } from './page-loading-overlay';

const meta = {
  title: 'Common/PageLoadingOverlay',
  component: PageLoadingOverlay,
  tags: ['autodocs'],
  args: { isLoading: true },
  parameters: {
    layout: 'fullscreen',
    docs: {
      page: () => (
        <>
          <Title />
          <Description />
          <Primary />
          <ArgTypes />
        </>
      ),
      story: { inline: false, iframeHeight: '320px' },
      description: {
        component:
          '페이지 전체가 준비되는 동안 기존 화면을 어둡게 덮고 중앙에 위버 W 심볼을 표시합니다. 로딩 중에는 배경 입력이 잠깁니다. 홈 화면 로딩 스토리의 Controls에서 `isLoading`을 바꿔 표시와 해제를 확인할 수 있습니다.',
      },
      source: { code: '<PageLoadingOverlay isLoading={isLoading} />' },
    },
  },
} satisfies Meta<typeof PageLoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeLoading: Story = {
  name: '홈 화면 로딩',
  render: (args) => (
    <MemoryRouter initialEntries={['/home']}>
      <GlobalHeader
        navigation={<MemberHeaderNavigation />}
        profile={<HeaderProfileMenu fullName="김민수" />}
      />
      <PageLoadingOverlay {...args} />
    </MemoryRouter>
  ),
  play: async ({ canvas }) => {
    const overlay = canvas.getByRole('dialog', { name: '로딩 중' });
    await expect(overlay).toBeVisible();
    await expect(overlay.matches(':modal')).toBe(true);
    await expect(overlay.textContent).toBe('');
  },
};
