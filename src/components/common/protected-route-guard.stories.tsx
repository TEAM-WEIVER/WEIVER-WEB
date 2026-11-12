import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, mocked, within } from 'storybook/test';
import { reissueAccessToken } from '@/lib/auth-api';
import { clearAccessToken, setAuthRole, setAuthSession } from '@/lib/auth-token';
import { ProtectedRouteGuard } from './protected-route-guard';
const meta = {
  title: 'Common/ProtectedRouteGuard',
  component: ProtectedRouteGuard,
  tags: ['autodocs'],
  args: { children: <p>회원 전용 콘텐츠</p> },
  beforeEach: () => {
    clearAccessToken();
    mocked(reissueAccessToken).mockReset();
    return () => clearAccessToken();
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Story />} />
          <Route path="/login" element={<p>로그인이 필요합니다.</p>} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ProtectedRouteGuard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Applicant: Story = {
  beforeEach: () => {
    setAuthSession('storybook-only-token', 'APPLICANT');
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('회원 전용 콘텐츠')).toBeVisible();
  },
};
export const Guest: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('로그인이 필요합니다.')).toBeVisible();
  },
};
export const Expired: Story = {
  beforeEach: () => {
    setAuthRole('APPLICANT');
    mocked(reissueAccessToken).mockRejectedValue(new Error('세션 만료 예시'));
  },
  play: Guest.play,
};
export const Pending: Story = {
  beforeEach: () => {
    setAuthRole('APPLICANT');
    mocked(reissueAccessToken).mockImplementation(() => new Promise(() => {}));
  },
  parameters: {
    docs: {
      description: {
        story:
          '현재 가드는 인증 확인 중 null을 반환하므로 빈 화면이 표시됩니다. 공통 로딩 UI 적용은 후속 개선 사항입니다.',
      },
    },
  },
};
