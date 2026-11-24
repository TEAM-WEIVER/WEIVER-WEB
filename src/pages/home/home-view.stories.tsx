import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { exampleFooterLinks, exampleHome } from './_storybook/fixtures';
import { MemberHomeView } from './home-view';

const meta = {
  title: 'Pages/Home',
  component: MemberHomeView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '회원 홈 UI. 예시 데이터와 동작은 Storybook에만 있으며 실제 공고·이력서·포인트 API 및 신규 경로는 미연결 상태입니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    ...exampleHome,
    footerLinks: exampleFooterLinks,
    onEditResume: fn(),
    onRetryResume: fn(),
    onOpenPointHistory: fn(),
    onChargePoints: fn(),
    onRetryPoints: fn(),
    onViewAllPostings: fn(),
    onContinuePosting: fn(),
    onRegisterPosting: fn(),
    onRetryPostings: fn(),
  },
} satisfies Meta<typeof MemberHomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: '김민수님, 오늘도 면접을 준비해볼까요?' }),
    ).toBeVisible();
    const resume = within(canvas.getByRole('region', { name: '공통 이력서' }));
    await expect(resume.getByText('작성 완료')).toBeVisible();
    await expect(resume.queryByText('자기소개서')).not.toBeInTheDocument();
    await expect(resume.queryByText('포트폴리오')).not.toBeInTheDocument();
    await userEvent.click(resume.getByRole('button', { name: '이력서 수정하기' }));
    await expect(args.onEditResume).toHaveBeenCalledOnce();
    await expect(
      within(canvas.getByRole('banner')).getByLabelText('보유 포인트 300P'),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole('region', { name: '내 포인트' })).getByText('300P'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '포인트 내역 보기' }));
    await userEvent.click(canvas.getByRole('button', { name: '포인트 충전하기' }));
    await expect(args.onOpenPointHistory).toHaveBeenCalledOnce();
    await expect(args.onChargePoints).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: '전체 보기 (7)' }));
    await expect(args.onViewAllPostings).toHaveBeenCalledOnce();
    const list = within(canvas.getByRole('list', { name: '준비 중인 공고 목록' }));
    await expect(list.getAllByRole('article')).toHaveLength(3);
    const first = within(list.getByRole('article', { name: '카카오페이 AI 서비스 기획' }));
    await expect(first.getByText('2/3 준비 완료')).toBeVisible();
    await userEvent.click(first.getByRole('button', { name: /이어서 준비하기/ }));
    await expect(args.onContinuePosting).toHaveBeenCalledWith('kakaopay');
    const second = within(list.getByRole('article', { name: '크래프톤 사업 PM' }));
    await expect(second.getByText('1/1 준비 완료')).toBeVisible();
    await expect(second.getByText('0회 진행')).toBeVisible();
    await expect(list.getByText('등록된 서류 없음')).toBeVisible();
    await expect(canvas.getByRole('contentinfo')).toBeVisible();
  },
};

export const ResumeNotStarted: Story = {
  args: { resume: { status: 'ready', data: { status: 'notStarted' } } },
  play: async ({ canvas, args, userEvent }) => {
    const section = within(canvas.getByRole('region', { name: '공통 이력서' }));
    await expect(section.getByText('미작성')).toBeVisible();
    await expect(section.queryByLabelText('필수')).not.toBeInTheDocument();
    await userEvent.click(section.getByRole('button', { name: '이력서 작성하기' }));
    await expect(args.onEditResume).toHaveBeenCalledOnce();
  },
};

export const ResumeInProgress: Story = {
  args: { resume: { status: 'ready', data: { status: 'inProgress' } } },
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByRole('region', { name: '공통 이력서' })).getByText('작성 중'),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: { postings: { status: 'ready', data: { postings: [], total: 0 } } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText(/아직 준비 중인 지원 공고가 없어요/)).toBeVisible();
    await expect(canvas.getByRole('button', { name: '전체 보기 (0)' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록' }));
    await expect(args.onRegisterPosting).toHaveBeenCalledOnce();
  },
};

export const ZeroPoints: Story = {
  args: { points: { status: 'ready', data: { balance: 0 } } },
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByRole('region', { name: '내 포인트' })).getByText('0P'),
    ).toBeVisible();
    await expect(canvas.queryByText(/1회당/)).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    fullName: '',
    resume: { status: 'loading' },
    points: { status: 'loading' },
    postings: { status: 'loading' },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: '이력서 불러오는 중' })).toBeVisible();
    await expect(canvas.getByRole('status', { name: '포인트 불러오는 중' })).toBeVisible();
    await expect(canvas.getByRole('status', { name: '준비 중인 공고 불러오는 중' })).toBeVisible();
    await expect(canvas.queryByText('미작성')).not.toBeInTheDocument();
    await expect(canvas.queryByText('0P')).not.toBeInTheDocument();
  },
};

export const Failed: Story = {
  args: { resume: { status: 'error' }, points: { status: 'error' }, postings: { status: 'error' } },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '이력서 관리 다시 불러오기' }));
    await userEvent.click(canvas.getByRole('button', { name: '포인트 다시 불러오기' }));
    await userEvent.click(canvas.getByRole('button', { name: '지원 공고 다시 불러오기' }));
    await expect(args.onRetryResume).toHaveBeenCalledOnce();
    await expect(args.onRetryPoints).toHaveBeenCalledOnce();
    await expect(args.onRetryPostings).toHaveBeenCalledOnce();
  },
};

export const RetryPostings: Story = {
  render: (args) => {
    const [failed, setFailed] = useState(true);
    return (
      <MemberHomeView
        {...args}
        postings={failed ? { status: 'error' } : exampleHome.postings}
        onRetryPostings={() => setFailed(false)}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '지원 공고 다시 불러오기' }));
    await expect(canvas.getByRole('list', { name: '준비 중인 공고 목록' })).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const Unavailable: Story = {
  args: {
    fullName: '',
    resume: { status: 'unavailable' },
    points: { status: 'unavailable' },
    postings: { status: 'unavailable' },
    footerLinks: undefined,
    onEditResume: undefined,
    onOpenPointHistory: undefined,
    onChargePoints: undefined,
    onViewAllPostings: undefined,
    onContinuePosting: undefined,
    onRegisterPosting: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('이력서 관리 기능을 준비 중이에요.')).toBeVisible();
    await expect(canvas.getByText('포인트 기능을 준비 중이에요.')).toBeVisible();
    await expect(canvas.getByText('지원 공고 기능을 준비 중이에요.')).toBeVisible();
    await expect(canvas.queryByText('0P')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '포인트 충전하기' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: '전체 보기' })).toBeDisabled();
  },
};

export const DisconnectedActions: Story = {
  args: {
    onEditResume: undefined,
    onOpenPointHistory: undefined,
    onChargePoints: undefined,
    onViewAllPostings: undefined,
    onContinuePosting: undefined,
    onRegisterPosting: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '이력서 수정하기' })).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: '카카오페이 AI 서비스 기획 이어서 준비하기' }),
    ).toBeDisabled();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const LongContent: Story = {
  args: {
    fullName: '아주긴이름을가진위버회원',
    points: { status: 'ready', data: { balance: 123456789, interviewCost: 1000 } },
    postings: {
      status: 'ready',
      data: {
        total: 123,
        postings: [
          {
            ...exampleHome.postings.data.postings[0],
            companyName: '사용자 경험을 연구하고 새로운 서비스를 만드는 아주 긴 회사 이름',
            positionName: '글로벌 AI 플랫폼 전략 및 신규 서비스 프로덕트 매니저',
            interviewCount: 1234,
          },
        ],
      },
    },
  },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
