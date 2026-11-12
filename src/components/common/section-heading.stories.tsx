import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SectionHeading } from './section-heading';

const meta = {
  title: 'Common/SectionHeading',
  component: SectionHeading,
  tags: ['autodocs'],
  args: { title: '학력', description: '학력 정보를 입력해주세요.' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SectionHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { level: 3, name: '학력' }),
    ).toBeVisible();
  },
};

export const PageTitle: Story = {
  args: {
    as: 'h1',
    title: '지원 준비',
    description: '지원하고 싶은 채용공고를 등록하고 AI 모의면접을 준비해보세요.',
  },
};

export const TitleOnly: Story = { args: { title: '자격증', description: undefined } };
export const Compact: Story = {
  args: {
    title: '지원서류 준비 현황',
    description: '이 공고에 사용할 지원서류를 확인하고 관리해보세요.',
    size: 'sm',
  },
};
export const Section: Story = {
  args: { as: 'h2', title: '수상', description: '수상 내역을 입력해주세요.' },
};

export const LongContent: Story = {
  args: {
    title: '지원하는 직무에 관련된 학력과 교육 경험을 작성해주세요',
    description:
      '학교에서 공부한 전공과 직무에 도움이 되는 교육 경험을 포함해 작성해주세요. 설명이 길어져도 내용이 잘리지 않습니다.',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-72">
        <Story />
      </div>
    ),
  ],
};
