import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DeleteJobPostingDialog } from './delete-job-posting-dialog';

const meta = {
  title: 'Preparation/DeleteJobPostingDialog',
  component: DeleteJobPostingDialog,
  tags: ['autodocs'],
  args: { postingName: '카카오뱅크 AI 서비스 기획', onDelete: fn(async () => {}) },
} satisfies Meta<typeof DeleteJobPostingDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('alertdialog'),
    ).toBeVisible();
  },
};
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '삭제' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog');
    await expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await expect(args.onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
export const Confirm: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제' }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(await body.findByRole('alertdialog')).getByRole('button', { name: '공고 삭제' }),
    );
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
export const FailureAndRetry: Story = {
  render: function Example(args) {
    const attempts = useRef(0);
    return (
      <DeleteJobPostingDialog
        {...args}
        onDelete={async () => {
          await args.onDelete?.();
          if (attempts.current++ === 0) throw new Error('예시 오류');
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제' }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(await body.findByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: '공고 삭제' }));
    await expect(await dialog.findByRole('alert')).toHaveTextContent('공고를 삭제하지 못했어요.');
    await userEvent.click(dialog.getByRole('button', { name: '공고 삭제' }));
    await expect(args.onDelete).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
export const Deleting: Story = {
  args: { onDelete: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제' }));
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: '공고 삭제' }));
    await expect(dialog.getByRole('button', { name: /공고 삭제/ })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: '취소' })).toBeDisabled();
    await expect(args.onDelete).toHaveBeenCalledOnce();
  },
};
