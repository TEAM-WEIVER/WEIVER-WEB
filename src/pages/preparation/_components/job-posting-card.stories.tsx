import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { JobPostingCard } from './job-posting-card';

const meta = {
  title: 'Preparation/JobPostingCard',
  component: JobPostingCard,
  tags: ['autodocs'],
  args: {
    posting: { id: 'kakao', companyName: '카카오뱅크', positionName: 'AI Native 서비스 기획자' },
    onSelect: fn(),
  },
} satisfies Meta<typeof JobPostingCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', {
        name: '카카오뱅크 AI Native 서비스 기획자 상세 보기',
      }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith('kakao');
  },
};
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith('kakao');
  },
};
export const LongName: Story = {
  args: {
    posting: {
      id: 'long',
      companyName: '글로벌소프트웨어솔루션서비스회사',
      positionName: '생성형 AI 서비스 기획 및 글로벌 프로젝트 운영 담당자',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-80">
        <Story />
      </div>
    ),
  ],
};
