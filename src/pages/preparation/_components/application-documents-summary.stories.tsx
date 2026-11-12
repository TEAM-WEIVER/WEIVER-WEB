import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { exampleDetail } from '../_storybook/fixtures';
import { ApplicationDocumentsSummary } from './application-documents-summary';

const meta = {
  title: 'Preparation/ApplicationDocumentsSummary',
  component: ApplicationDocumentsSummary,
  tags: ['autodocs'],
  args: { documents: exampleDetail.documents, onOpenDocument: fn() },
} satisfies Meta<typeof ApplicationDocumentsSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const MixedStates: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '포트폴리오 작성하기' }));
    await expect(args.onOpenDocument).toHaveBeenCalledWith('portfolio');
    await userEvent.click(canvas.getByRole('button', { name: '이력서 수정하기' }));
    await expect(args.onOpenDocument).toHaveBeenCalledWith('resume');
  },
};
export const Unconnected: Story = { args: { onOpenDocument: undefined } };
export const Empty: Story = { args: { documents: [] } };
