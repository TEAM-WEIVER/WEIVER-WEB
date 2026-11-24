import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect } from 'storybook/test';

import { PolicyPage } from './policy-page';

const meta = {
  title: 'Pages/Service/Policy',
  component: PolicyPage,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <main className="mx-auto max-w-4xl p-6">
          <Story />
        </main>
      </MemoryRouter>
    ),
  ],
  args: { kind: 'terms' },
} satisfies Meta<typeof PolicyPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Terms: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: '이용약관' })).toBeVisible();
    await expect(
      canvas.getByRole('heading', { level: 2, name: '개인회원 이용약관' }),
    ).toBeVisible();
  },
};
export const Privacy: Story = {
  args: { kind: 'privacy' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeVisible();
    await expect(canvas.getByText(/수집 항목/)).toBeVisible();
  },
};
export const Mobile: Story = {
  args: { kind: 'privacy' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
