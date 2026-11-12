import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';

import { GlobalHeader } from './global-header';
import { HeaderProfileButton } from './header-profile-button';
import { MemberHeaderNavigation } from './member-header-navigation';

const meta = {
  title: 'Common/MemberHeaderNavigation',
  component: MemberHeaderNavigation,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <GlobalHeader navigation={<Story />} profile={<HeaderProfileButton fullName="김민채" />} />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof MemberHeaderNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/home');
    for (const name of ['지원 준비', 'AI 면접', '역량 리포트']) {
      await expect(canvas.getByRole('button', { name })).toBeDisabled();
    }
    await expect(canvas.getByRole('button', { name: '김민채 프로필' })).toBeVisible();
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
