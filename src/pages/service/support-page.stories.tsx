import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, fn } from 'storybook/test';

import SupportPage from './support-page';

const meta = {
  title: 'Pages/Service/Support',
  component: SupportPage,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <main className="mx-auto max-w-4xl p-6">
          <Story />
        </main>
      </MemoryRouter>
    ),
  ],
  args: { onSubmit: fn().mockResolvedValue(undefined) },
} satisfies Meta<typeof SupportPage>;
export default meta;
type Story = StoryObj<typeof SupportPage>;

export const Default: Story = {};
export const Validation: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: '문의 접수' }));
    await expect(canvas.getByText('제목을 입력해주세요.')).toBeVisible();
    await expect(canvas.getByText('문의 내용을 입력해주세요.')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const Submitted: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText('문의 제목'), '이력서 문의');
    await userEvent.type(canvas.getByLabelText('문의 내용'), '저장한 이력서를 확인하고 싶어요.');
    await userEvent.click(canvas.getByRole('button', { name: '문의 접수' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('문의가 접수되었어요.');
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: '이력서 문의',
      content: '저장한 이력서를 확인하고 싶어요.',
    });
    await expect(canvas.getByLabelText('문의 제목')).toHaveValue('');
  },
};
export const Failed: Story = {
  args: {
    onSubmit: async () => {
      throw new Error('mock failure');
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('문의 제목'), '이력서 문의');
    await userEvent.type(canvas.getByLabelText('문의 내용'), '입력한 문의 내용');
    await userEvent.click(canvas.getByRole('button', { name: '문의 접수' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('문의를 접수하지 못했어요.');
    await expect(canvas.getByLabelText('문의 제목')).toHaveValue('이력서 문의');
    await expect(canvas.getByLabelText('문의 내용')).toHaveValue('입력한 문의 내용');
  },
};
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
