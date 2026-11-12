import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';

import PreparationNewPage from './page';

const meta = {
  title: 'Pages/Preparation/New',
  component: PreparationNewPage,
  args: { onBack: fn(), onSubmit: fn(async () => {}) },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '등록 화면 UI. 뒤로가기와 제출은 주입된 콜백으로 확인하며, 아직 URL/API 및 임시 저장은 연결하지 않았습니다.',
      },
    },
  },
  decorators: [withPreparationHeader],
} satisfies Meta<typeof PreparationNewPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: '지원 공고 등록' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '지원 공고 목록' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Filled: Story = {
  args: {
    initialValues: {
      companyName: '카카오뱅크',
      positionName: 'AI 서비스 기획',
      content:
        '담당할 업무\n• 대화형 AI 서비스 신규 기능 기획 및 개선 요건 발굴\n• 대화형 AI 서비스 개발 협업 및 프로젝트 사이클 관리\n• AI Agent 전략 수립 및 세부 기능 기획\n\n필수 경험과 역량\n• 모바일 앱 서비스 기획 및 운영 경험\n• 사용자 중심의 사고 및 문제 해결 역량\n\n우대사항\n• 데이터 설계 및 분석 업무가 가능한 분',
    },
  },
};

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
