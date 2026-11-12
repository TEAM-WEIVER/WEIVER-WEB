import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { examplePostings } from '../_storybook/fixtures';
import { JobPostingSidebar } from './job-posting-sidebar';

const meta = {
  title: 'Preparation/JobPostingSidebar',
  component: JobPostingSidebar,
  tags: ['autodocs'],
  args: { postings: examplePostings, selectedId: 'kakao', onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JobPostingSidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Example(args) {
    const [selectedId, setSelectedId] = useState(args.selectedId);
    return (
      <JobPostingSidebar
        {...args}
        selectedId={selectedId}
        onSelect={(id) => {
          args.onSelect(id);
          setSelectedId(id);
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole('button', { name: '크래프톤 사업 PM' });
    await userEvent.click(next);
    await expect(args.onSelect).toHaveBeenCalledWith('krafton');
    await expect(next).toHaveAttribute('aria-current', 'true');
    await expect(
      canvas.getByRole('button', { name: '카카오뱅크 AI 서비스 기획' }),
    ).not.toHaveAttribute('aria-current');
  },
};
export const Empty: Story = { args: { postings: [] } };
export const LongNames: Story = {
  args: {
    postings: [
      {
        id: 'kakao',
        companyName: '매우긴회사이름을가진기업의글로벌서비스사업부',
        positionName: '생성형 AI 기반 글로벌 서비스 전략 수립 및 프로젝트 기획 담당자',
      },
    ],
  },
};
