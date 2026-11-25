import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ApplicantHeaderProfile } from './applicant-header-profile';

const meta = {
  title: 'Common/ApplicantHeaderProfile',
  component: ApplicantHeaderProfile,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
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
export const Loading: Story = {
  args: { loadName: () => new Promise<string>(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: '내 계정' });
    await expect(trigger).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(trigger);
    await expect(await page.findByRole('menuitem', { name: '로그아웃' })).toBeInTheDocument();
  },
};
export const Empty: Story = { args: { loadName: async () => '' } };
export const Failed: Story = {
  args: {
    loadName: async () => {
      throw new Error('예시 오류');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole('button', { name: '내 계정', busy: false }));
    await expect(
      await page.findByRole('menuitem', { name: '프로필 다시 불러오기' }),
    ).toBeInTheDocument();
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeInTheDocument();
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
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole('button', { name: '내 계정', busy: false }));
    await userEvent.click(await page.findByRole('menuitem', { name: '프로필 다시 불러오기' }));
    await expect(await canvas.findByRole('button', { name: '이지수 프로필' })).toBeVisible();
  },
};

export const SharedName: Story = {
  args: { onNameLoaded: fn() },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole('button', { name: '김민채 프로필' })).toBeVisible();
    await expect(args.onNameLoaded).toHaveBeenCalledOnce();
    await expect(args.onNameLoaded).toHaveBeenCalledWith('김민채');
  },
};
