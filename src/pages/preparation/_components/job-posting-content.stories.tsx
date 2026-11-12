import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { exampleDetail } from '../_storybook/fixtures';
import { JobPostingContent } from './job-posting-content';

const meta = {
  title: 'Preparation/JobPostingContent',
  component: JobPostingContent,
  tags: ['autodocs'],
  args: { content: exampleDetail.posting.content, sourceUrl: exampleDetail.posting.sourceUrl },
} satisfies Meta<typeof JobPostingContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: '원본 채용공고 새 창 열기' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  },
};
export const WithoutSource: Story = { args: { sourceUrl: '' } };
export const UnsafeSource: Story = {
  args: {
    sourceUrl: 'javascript:alert(1)',
    content: '<script>alert("공고 본문은 일반 텍스트로 표시")</script>',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('link')).not.toBeInTheDocument();
    await expect(within(canvasElement).getByText(/<script>/)).toBeVisible();
  },
};
