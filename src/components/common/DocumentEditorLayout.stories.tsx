import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { DocumentEditorLayout } from './DocumentEditorLayout';

const meta = {
  title: 'Common/DocumentEditorLayout',
  component: DocumentEditorLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    activeDocument: 'resume',
    progress: 40,
    onSaveDraft: fn(),
    onDocumentChange: fn(),
    children: <h1 className="text-h3">학력</h1>,
  },
} satisfies Meta<typeof DocumentEditorLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('이력서').closest('[aria-current]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '40',
    );
    await userEvent.click(canvas.getByRole('button', { name: /자기소개서/ }));
    await expect(args.onDocumentChange).toHaveBeenCalledWith('cover-letter');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledOnce();
    await expect(args.onSaveDraft).toHaveBeenCalledWith();
  },
};
