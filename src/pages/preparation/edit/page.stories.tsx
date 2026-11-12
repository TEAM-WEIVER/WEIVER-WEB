import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { JobPostingValues } from '@/schemas/job-posting';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';
import { exampleDetail } from '../_storybook/fixtures';
import PreparationEditPage from './page';

const meta = {
  title: 'Pages/Preparation/Edit',
  component: PreparationEditPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '공고 조회 완료 후 기존 값을 채운 수정 화면. 취소/뒤로가기는 onBack, 저장은 onSubmit으로 연결합니다. 실제 저장 및 이동은 수행하지 않으며 API 연동은 #153에서 진행합니다.',
      },
    },
  },
  decorators: [withPreparationHeader],
  args: {
    posting: exampleDetail.posting,
    onBack: fn(),
    onSubmit: fn<(values: JobPostingValues) => Promise<void>>(async () => {}),
  },
} satisfies Meta<typeof PreparationEditPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: '회사명 *' })).toHaveValue(
      args.posting.companyName,
    );
    await expect(canvas.getByRole('textbox', { name: '포지션명 *' })).toHaveValue(
      args.posting.positionName,
    );
    await expect(canvas.getByRole('textbox', { name: '채용 공고 내용 *' })).toHaveValue(
      args.posting.content,
    );
  },
};
export const Save: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const position = canvas.getByRole('textbox', { name: '포지션명 *' });
    await userEvent.clear(position);
    await userEvent.type(position, 'AI 서비스 PM');
    await userEvent.click(canvas.getByRole('button', { name: '변경사항 저장' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      companyName: args.posting.companyName,
      positionName: 'AI 서비스 PM',
      sourceUrl: args.posting.sourceUrl,
      content: args.posting.content,
    });
    await expect(args.onBack).not.toHaveBeenCalled();
  },
};
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '취소' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const Invalid: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByRole('textbox', { name: '채용 공고 내용 *' }));
    await userEvent.click(canvas.getByRole('button', { name: '변경사항 저장' }));
    await expect(
      canvas.getByRole('textbox', { name: '채용 공고 내용 *' }),
    ).toHaveAccessibleDescription('채용 공고 내용을 입력해주세요.');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const FailureAndRetry: Story = {
  render: function Example(args) {
    const attempts = useRef(0);
    return (
      <PreparationEditPage
        {...args}
        onSubmit={async (values) => {
          await args.onSubmit(values);
          if (attempts.current++ === 0) throw new Error('예시 오류');
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const position = canvas.getByRole('textbox', { name: '포지션명 *' });
    await userEvent.clear(position);
    await userEvent.type(position, '수정한 포지션');
    await userEvent.click(canvas.getByRole('button', { name: '변경사항 저장' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      '변경사항을 저장하지 못했어요.',
    );
    await expect(position).toHaveValue('수정한 포지션');
    await userEvent.click(canvas.getByRole('button', { name: '변경사항 저장' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(2);
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};
export const Saving: Story = {
  args: {
    onSubmit: fn<(values: JobPostingValues) => Promise<void>>(() => new Promise<void>(() => {})),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '변경사항 저장' }));
    for (const name of ['변경사항 저장', '취소', '공고 상세']) {
      await expect(canvas.getByRole('button', { name: new RegExp(name) })).toBeDisabled();
    }
    await expect(canvas.getByRole('textbox', { name: '회사명 *' })).toBeDisabled();
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
