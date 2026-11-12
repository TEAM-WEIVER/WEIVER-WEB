import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { toast, useToastStore } from '@/store/toast-store';
import { Button } from '@/components/ui/button';
import { ToastContainer } from './toast-container';
const meta = {
  title: 'Common/ToastContainer',
  component: ToastContainer,
  tags: ['autodocs'],
  beforeEach: () => {
    useToastStore.setState({ toasts: [] });
    return () => useToastStore.setState({ toasts: [] });
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ToastContainer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AddAndDismiss: Story = {
  render: () => (
    <div className="min-h-64 p-6">
      <Button onClick={() => toast.add({ type: 'success', title: '저장 완료', duration: 60000 })}>
        알림 표시
      </Button>
      <ToastContainer />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '알림 표시' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('저장 완료');
    await userEvent.click(canvas.getByRole('button', { name: '알림 닫기' }));
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};
export const AutoDismiss: Story = {
  render: () => (
    <div className="min-h-64 p-6">
      <Button
        onClick={() => toast.add({ type: 'info', title: '잠시 후 사라집니다', duration: 300 })}
      >
        알림 표시
      </Button>
      <ToastContainer />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '알림 표시' }));
    await expect(canvas.getByRole('status')).toBeVisible();
    await waitFor(() => expect(canvas.queryByRole('status')).not.toBeInTheDocument());
  },
};
