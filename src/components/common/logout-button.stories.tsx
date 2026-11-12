import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, mocked, userEvent, within } from 'storybook/test';
import { logout } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { LogoutButton } from './logout-button';
const meta = {
  title: 'Common/LogoutButton',
  component: LogoutButton,
  tags: ['autodocs'],
  beforeEach: () => {
    mocked(logout)
      .mockReset()
      .mockResolvedValue({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Story />} />
          <Route path="/login" element={<p>로그인 화면으로 이동했습니다.</p>} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof LogoutButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const IconOnly: Story = { args: { showLabel: false } };
export const AsButton: Story = {
  render: () => (
    <LogoutButton asChild>
      <Button variant="outline">로그아웃</Button>
    </LogoutButton>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '로그아웃' }));
    await expect(await canvas.findByText('로그인 화면으로 이동했습니다.')).toBeVisible();
    await expect(logout).toHaveBeenCalled();
  },
};
export const Pending: Story = {
  beforeEach: () => {
    mocked(logout).mockImplementation(() => new Promise(() => {}));
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '로그아웃' });
    await userEvent.click(button);
    await expect(button).toBeDisabled();
  },
};
export const ApiFailure: Story = {
  beforeEach: () => {
    mocked(logout).mockRejectedValue(new Error('예시 오류'));
  },
  play: AsButton.play,
};
