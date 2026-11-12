import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';
import { exampleDetail, examplePostings } from '../_storybook/fixtures';
import PreparationDetailPage from './page';

const meta = {
  title: 'Pages/Preparation/Detail',
  component: PreparationDetailPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '공고 상세 UI. 데이터와 동작은 props로 주입하며 실제 URL/API는 미연결입니다. 서류 필수 여부·면접 시작 가능 여부는 예시 데이터이며 제품 정책을 하드코딩하지 않습니다. 삭제 성공 후 목록 이동/갱신은 onDelete를 연결하는 쪽에서 처리합니다.',
      },
    },
  },
  decorators: [withPreparationHeader],
  args: {
    postings: examplePostings,
    selectedId: 'kakao',
    detail: exampleDetail,
    onBack: fn(),
    onSelectPosting: fn(),
    onEdit: fn(),
    onDelete: fn(async () => {}),
    onOpenDocument: fn(),
    onOpenReport: fn(),
    onStartInterview: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof PreparationDetailPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'AI 서비스 기획' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '수정' }));
    await expect(args.onEdit).toHaveBeenCalledWith('kakao');
    await userEvent.click(canvas.getByRole('button', { name: '이력서 수정하기' }));
    await expect(args.onOpenDocument).toHaveBeenCalledWith('kakao', 'resume');
    await expect(canvas.getByRole('button', { name: 'AI 면접 시작' })).toBeDisabled();
  },
};

export const SwitchPosting: Story = {
  render: function Example(args) {
    const [selectedId, setSelectedId] = useState(args.selectedId);
    const posting = examplePostings.find((item) => item.id === selectedId)!;
    return (
      <PreparationDetailPage
        {...args}
        selectedId={selectedId}
        detail={{
          ...exampleDetail,
          posting: { ...exampleDetail.posting, ...posting },
          interviews: selectedId === 'kakao' ? exampleDetail.interviews : [],
        }}
        onSelectPosting={(id) => {
          args.onSelectPosting(id);
          setSelectedId(id);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '크래프톤 사업 PM' }));
    await expect(canvas.getByRole('heading', { level: 1, name: '사업 PM' })).toBeVisible();
    await expect(canvas.getByText('아직 진행한 모의면접이 없어요.')).toBeVisible();
  },
};

export const NoSourceOrHistory: Story = {
  args: {
    detail: {
      ...exampleDetail,
      posting: { ...exampleDetail.posting, sourceUrl: '' },
      interviews: [],
    },
  },
};
export const InterviewReady: Story = {
  args: { detail: { ...exampleDetail, canStartInterview: true } },
};
export const Unconnected: Story = {
  args: {
    onOpenDocument: undefined,
    onStartInterview: undefined,
    onOpenReport: undefined,
    onEdit: undefined,
    onDelete: undefined,
  },
};
export const Loading: Story = { args: { detail: { status: 'loading' } } };
export const Failed: Story = {
  args: { detail: { status: 'error' } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '다시 시도' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
export const NotFound: Story = { args: { detail: { status: 'notFound' } } };
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const LongContent: Story = {
  args: {
    detail: {
      ...exampleDetail,
      posting: {
        ...exampleDetail.posting,
        companyName: '매우긴이름의글로벌소프트웨어서비스회사',
        positionName: '대규모 생성형 AI 서비스의 제품 기획과 글로벌 프로젝트 관리 담당자',
        content: '줄바꿈없는긴공고본문'.repeat(60),
        sourceUrl: `https://example.com/${'long-job-path-'.repeat(30)}`,
      },
    },
  },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
