import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { InterviewStartButton } from './interview-start-button';

const meta = {
  title: 'Common/InterviewStartButton',
  component: InterviewStartButton,
  tags: ['autodocs'],
  args: { onClick: fn() },
} satisfies Meta<typeof InterviewStartButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'AI 면접 시작' });
    await expect(button).toHaveStyle({
      backgroundColor: 'rgb(45, 212, 191)',
      color: 'rgb(15, 23, 42)',
    });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'AI 면접 시작' });
    await expect(button).toBeDisabled();
    await userEvent.tab();
    await expect(button).not.toHaveFocus();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /AI 면접 시작/ });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};
export const KeyboardFocus: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'AI 면접 시작' });
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
