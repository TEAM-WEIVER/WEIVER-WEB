import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';

import { examplePostings } from '../_storybook/fixtures';
import PreparationListPage from './page';

const postings = examplePostings.map((posting, index) => ({
  ...posting,
  positionName: ['AI Native 서비스 기획자', '사업 PM', 'Product Manager'][index],
}));

const meta = {
  title: 'Pages/Preparation/List',
  component: PreparationListPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '등록한 공고 목록과 상태별 UI. 주입된 목록 내에서 회사명/포지션명을 검색합니다. 경로/API는 미연결이며 등록 및 상세 진입은 콜백으로 확인합니다.',
      },
    },
  },
  args: {
    state: { status: 'ready', postings: [] },
    onRegister: fn(),
    onSelectPosting: fn(),
    onRetry: fn(),
  },
  decorators: [withPreparationHeader],
} satisfies Meta<typeof PreparationListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '지원 준비', level: 1 })).toBeVisible();
    await expect(canvas.getByText(/아직 등록된 채용 공고가 없어요/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '공고 등록' }));
    await expect(args.onRegister).toHaveBeenCalledOnce();
  },
};

export const SearchWithoutPostings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox', { name: '회사명 또는 포지션명으로 공고 검색' });
    await userEvent.type(search, '프론트엔드');
    await expect(search).toHaveValue('프론트엔드');
    await expect(canvas.getByText(/아직 등록된 채용 공고가 없어요/)).toBeVisible();
  },
};

export const Mobile: Story = {
  args: { state: { status: 'ready', postings } },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const Populated: Story = {
  args: { state: { status: 'ready', postings } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      within(canvas.getByRole('list', { name: '등록한 공고' })).getAllByRole('button'),
    ).toHaveLength(3);
    await userEvent.click(
      canvas.getByRole('button', { name: '카카오뱅크 AI Native 서비스 기획자 상세 보기' }),
    );
    await expect(args.onSelectPosting).toHaveBeenCalledWith('kakao');
  },
};
export const Search: Story = {
  args: { state: { status: 'ready', postings } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox');
    await userEvent.type(search, '  카카오  ');
    await expect(canvas.getByRole('status')).toHaveTextContent('검색 결과 1개');
    await expect(
      canvas.getByRole('button', { name: '카카오뱅크 AI Native 서비스 기획자 상세 보기' }),
    ).toBeVisible();
    await userEvent.clear(search);
    await userEvent.type(search, 'product manager');
    await expect(
      canvas.getByRole('button', { name: 'CJ ENM Product Manager 상세 보기' }),
    ).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('검색 결과 1개');
  },
};
export const NoResults: Story = {
  args: { state: { status: 'ready', postings } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('searchbox'), '없는회사');
    await expect(canvas.getByRole('heading', { name: '검색 결과가 없어요.' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '검색 초기화' }));
    await expect(canvas.getByRole('searchbox')).toHaveValue('');
    await expect(canvas.getByRole('status')).toHaveTextContent('검색 결과 3개');
  },
};
export const Loading: Story = { args: { state: { status: 'loading' } } };
export const Failed: Story = {
  args: { state: { status: 'error' } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '다시 시도' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
