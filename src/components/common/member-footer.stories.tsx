import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router';
import { expect, within } from 'storybook/test';

import { MemberFooter } from './member-footer';

function RouteLocation() {
  return <output aria-label="현재 경로">{useLocation().pathname}</output>;
}

const meta = {
  title: 'Common/MemberFooter',
  component: MemberFooter,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <Story />
        <RouteLocation />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof MemberFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const footer = within(canvas.getByRole('contentinfo'));
    await expect(footer.getByRole('navigation', { name: '서비스 안내' })).toBeVisible();
    await expect(footer.getAllByRole('button')).toHaveLength(3);
    for (const [label, path] of [
      ['이용약관', '/terms'],
      ['개인정보처리방침', '/privacy'],
      ['고객지원', '/support'],
    ]) {
      await userEvent.click(footer.getByRole('button', { name: label }));
      await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent(path);
    }
  },
};

export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole('button', { name: '이용약관' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/terms');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '개인정보처리방침' })).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/privacy');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '고객지원' })).toHaveFocus();
  },
};

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const LongLabels: Story = {
  args: {
    links: [
      { label: '위버 서비스 이용약관 및 개인회원 이용 안내', to: '/terms' },
      { label: '개인정보처리방침 및 개인정보 관련 문의', to: '/privacy' },
      { label: '서비스 이용에 관한 고객지원', to: '/support' },
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
