import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { GlobalHeader, HeaderNavItem } from '@/components/common/global-header';
import { HeaderProfileButton } from '@/components/common/header-profile-button';

import PreparationListPage from './page';

const meta = {
  title: 'Pages/Preparation/List',
  component: PreparationListPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '공고가 없는 상태의 지원 준비 화면. 경로와 API는 아직 연결하지 않았으며 공고 등록은 Actions에서 콜백으로 확인합니다. 헤더는 지원 준비 활성 상태의 구성 예시입니다.',
      },
    },
  },
  args: { onRegister: fn() },
  decorators: [
    (Story) => (
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
    ),
  ],
} satisfies Meta<typeof PreparationListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '지원 준비', level: 1 })).toBeVisible();
    await expect(canvas.getByText(/아직 등록된 채용 공고가 없어요/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록' }));
    await expect(args.onRegister).toHaveBeenCalledOnce();
  },
};

export const SearchWithoutPostings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox', { name: '회사명 또는 포지션명으로 공고 검색' });
    await userEvent.type(search, '프론트엔드');
    await expect(search).toHaveValue('프론트엔드');
    await expect(canvas.getByText(/아직 등록된 채용 공고가 없어요/)).toBeVisible();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
