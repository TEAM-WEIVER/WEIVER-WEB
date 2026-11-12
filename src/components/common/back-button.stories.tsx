import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BackButton } from './back-button';

const meta = {
  title: 'Common/BackButton',
  component: BackButton,
  tags: ['autodocs'],
  args: { onClick: fn() },
} satisfies Meta<typeof BackButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ToPostings: Story = {
  args: { children: '지원 공고 목록' },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: '지원 공고 목록' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledOnce();
    await expect(button).toHaveAttribute('type', 'button');
  },
};
export const Disabled: Story = {
  args: { children: '지원 공고 목록', disabled: true },
};
