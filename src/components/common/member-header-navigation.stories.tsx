import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';

import { GlobalHeader } from './global-header';
import { HeaderProfileMenu } from './header-profile-menu';
import { MemberHeaderNavigation } from './member-header-navigation';

const meta = {
  title: 'Common/MemberHeaderNavigation',
  component: MemberHeaderNavigation,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, context) => (
      <MemoryRouter initialEntries={[context.parameters.initialPath ?? '/home']}>
        <GlobalHeader navigation={<Story />} profile={<HeaderProfileMenu fullName="김민채" />} />
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
    await expect(canvas.getByRole('link', { name: '지원 준비' })).toHaveAttribute(
      'href',
      '/preparation',
    );
    for (const name of ['AI 면접', '역량 리포트']) {
      await expect(canvas.getByRole('button', { name })).toBeDisabled();
    }
    await expect(canvas.getByRole('button', { name: '김민채 프로필' })).toBeVisible();
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const Preparation: Story = {
  parameters: { initialPath: '/preparation/posting-1/resume' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '지원 준비' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  },
};

export const MasterForPosting: Story = {
  parameters: { initialPath: '/resume/master?postingId=posting-1' },
  play: Preparation.play,
};
