import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MemberFooter } from './member-footer';

const links = [
  { label: '이용약관', href: '#terms' },
  { label: '개인정보처리방침', href: '#privacy' },
  { label: '고객지원', href: '#support' },
];

const meta = {
  title: 'Common/MemberFooter',
  component: MemberFooter,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { links },
} satisfies Meta<typeof MemberFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const footer = within(canvas.getByRole('contentinfo'));
    await expect(footer.getByRole('navigation', { name: '서비스 안내' })).toBeVisible();
    await expect(footer.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '#terms');
    await expect(footer.getAllByRole('link')).toHaveLength(3);
    await expect(footer.getByText('© weiver. All rights reserved.')).toBeVisible();
  },
};

export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const first = canvas.getByRole('link', { name: '이용약관' });
    first.focus();
    await expect(first).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: '개인정보처리방침' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: '고객지원' })).toHaveFocus();
  },
};

export const Unavailable: Story = {
  args: { links: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    await expect(canvas.getByText('이용약관').closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(canvas.getAllByText('(준비 중)')).toHaveLength(3);
  },
};

export const PartiallyConnected: Story = {
  args: { links: [links[0], { label: '개인정보처리방침' }, links[2]] },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const LongLabels: Story = {
  args: {
    links: [
      { label: '위버 서비스 이용약관 및 개인회원 이용 안내', href: '#terms' },
      { label: '개인정보처리방침 및 개인정보 관련 문의', href: '#privacy' },
      { label: '서비스 이용에 관한 고객지원' },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-90">
        <Story />
      </div>
    ),
  ],
};
