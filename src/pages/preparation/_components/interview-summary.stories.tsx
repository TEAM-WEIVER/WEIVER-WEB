import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { exampleDetail } from '../_storybook/fixtures';
import { InterviewSummary } from './interview-summary';

const meta = {
  title: 'Preparation/InterviewSummary',
  component: InterviewSummary,
  tags: ['autodocs'],
  args: { interviews: exampleDetail.interviews, canStart: true, onStart: fn(), onOpenReport: fn() },
} satisfies Meta<typeof InterviewSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'AI 면접 시작' }));
    await expect(args.onStart).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: '2026-11-04 면접 리포트 보기' }));
    await expect(args.onOpenReport).toHaveBeenCalledWith('interview-1');
  },
};
export const Unavailable: Story = {
  args: { canStart: false, unavailableReason: '면접 시작 조건을 확인해주세요.' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'AI 면접 시작' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription('면접 시작 조건을 확인해주세요.');
  },
};
export const NoHistory: Story = { args: { interviews: [] } };
export const Analyzing: Story = {
  args: {
    interviews: [{ id: 'pending', date: '2026-11-12', score: null, reportAvailable: false }],
  },
};
