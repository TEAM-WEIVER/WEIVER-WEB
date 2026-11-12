import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ApplicantHeaderProfile } from './applicant-header-profile';

const meta = {
  title: 'Common/ApplicantHeaderProfile',
  component: ApplicantHeaderProfile,
  tags: ['autodocs'],
  args: { loadName: async () => '김민채', onClick: fn() },
} satisfies Meta<typeof ApplicantHeaderProfile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Loaded: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('button', { name: '김민채 프로필' }),
    ).toBeVisible();
    await expect(within(canvasElement).getByText('민채')).toBeVisible();
  },
};
export const Loading: Story = { args: { loadName: () => new Promise<string>(() => {}) } };
export const Empty: Story = { args: { loadName: async () => '' } };
export const Failed: Story = {
  args: {
    loadName: async () => {
      throw new Error('예시 오류');
    },
  },
};
export const Retry: Story = {
  render: () => {
    let count = 0;
    const loadName = async () => {
      if (count++ === 0) throw new Error('예시 오류');
      return '이지수';
    };
    return <ApplicantHeaderProfile loadName={loadName} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: '프로필 다시 불러오기' }));
    await expect(await canvas.findByRole('button', { name: '이지수 프로필' })).toBeVisible();
  },
};
