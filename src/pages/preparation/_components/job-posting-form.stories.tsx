import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { JobPostingForm } from './job-posting-form';

const initialValues = {
  companyName: '카카오뱅크',
  positionName: 'AI 서비스 기획',
  sourceUrl: 'https://example.com/jobs/ai-planner',
  content:
    '담당할 업무\n• AI 서비스 신규 기능 기획\n• 프로젝트 일정 관리\n\n필수 경험과 역량\n• 사용자 중심의 사고와 문제 해결 역량',
};

const meta = {
  title: 'Preparation/JobPostingForm',
  component: JobPostingForm,
  tags: ['autodocs'],
  args: { onSubmit: fn(async () => {}) },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '등록/수정에 재사용할 입력 폼. initialValues는 마운트 시 초기값이며 서버 응답 대기 후 마운트하거나 공고 id를 key로 지정합니다. 실제 API·자동 저장·AI 분석은 수행하지 않습니다.',
      },
    },
  },
} satisfies Meta<typeof JobPostingForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { initialValues } };
export const Invalid: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole('textbox', { name: '채용공고 URL (선택)' }),
      'javascript:alert(1)',
    );
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록하기' }));
    await expect(canvas.getByText('회사명을 입력해주세요.')).toBeVisible();
    await expect(canvas.getByText('포지션명을 입력해주세요.')).toBeVisible();
    await expect(
      canvas.getByText('http:// 또는 https://로 시작하는 올바른 URL을 입력해주세요.'),
    ).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Submit: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: '회사명 *' }), '  카카오뱅크  ');
    await userEvent.type(canvas.getByRole('textbox', { name: '포지션명 *' }), 'AI 서비스 기획');
    await userEvent.type(
      canvas.getByRole('textbox', { name: '채용 공고 내용' }),
      'AI 서비스 기획 및 운영',
    );
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록하기' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      companyName: '카카오뱅크',
      positionName: 'AI 서비스 기획',
      sourceUrl: '',
      content: 'AI 서비스 기획 및 운영',
    });
  },
};

export const Failed: Story = {
  args: {
    initialValues,
    onSubmit: fn(async () => {
      throw new Error('예시 서버 오류');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록하기' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('공고를 등록하지 못했어요.');
    await expect(canvas.getByRole('textbox', { name: '회사명 *' })).toHaveValue('카카오뱅크');
    await expect(canvas.getByRole('button', { name: '공고 등록하기' })).toBeEnabled();
  },
};

export const Submitting: Story = {
  args: { initialValues, onSubmit: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록하기' }));
    await expect(canvas.getByRole('button', { name: /공고 등록하기/ })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: '회사명 *' })).toBeDisabled();
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};
