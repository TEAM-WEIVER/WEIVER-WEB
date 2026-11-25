import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test';

import { logout } from '@/lib/auth-api';

import { GlobalHeader } from './global-header';
import { HeaderProfileMenu } from './header-profile-menu';

const meta = {
  title: 'Common/HeaderProfileMenu',
  component: HeaderProfileMenu,
  tags: ['autodocs'],
  args: { fullName: '김민채' },
  parameters: { layout: 'fullscreen' },
  beforeEach: () => {
    mocked(logout)
      .mockReset()
      .mockResolvedValue({ status: 'OK', code: 200, data: 'OK', message: 'OK' });
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <div className="min-h-52">
                <GlobalHeader profile={<Story />} />
              </div>
            }
          />
          <Route path="/login" element={<p>로그인 화면으로 이동했습니다.</p>} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof HeaderProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button');
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeVisible());
    await expect(logout).not.toHaveBeenCalled();
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '김민채 프로필' });
    const page = within(canvasElement.ownerDocument.body);
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(logout).not.toHaveBeenCalled();
  },
};

export const DismissOutside: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: '김민채 프로필' }));
    await waitFor(() => expect(page.getByRole('menu')).toBeVisible());
    await userEvent.click(canvas.getByRole('img', { name: '위버' }));
    await waitFor(() => expect(page.queryByRole('menu')).not.toBeInTheDocument());
    await expect(logout).not.toHaveBeenCalled();
  },
};

export const Logout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: '김민채 프로필' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(await canvas.findByText('로그인 화면으로 이동했습니다.')).toBeVisible();
    await expect(logout).toHaveBeenCalledOnce();
    await expect(page.queryByRole('menu')).not.toBeInTheDocument();
  },
};

export const ApiFailure: Story = {
  beforeEach: () => {
    mocked(logout).mockRejectedValue(new Error('예시 오류'));
  },
  play: Logout.play,
};

export const MissingName: Story = { args: { fullName: null }, play: Open.play };
export const LongName: Story = {
  args: { fullName: 'Alexandria Montgomery' },
  play: Open.play,
};
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: Open.play,
};
