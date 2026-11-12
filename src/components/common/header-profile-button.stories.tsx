import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { HeaderProfileButton } from './header-profile-button';
const meta = {
  title: 'Common/HeaderProfileButton',
  component: HeaderProfileButton,
  tags: ['autodocs'],
  args: { fullName: '김민채', onClick: fn() },
} satisfies Meta<typeof HeaderProfileButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const profile = canvas.getByRole('button', { name: '김민채 프로필' });
    await expect(within(profile).getByText('민채')).toHaveAttribute('aria-hidden', 'true');
    await expect(within(profile).getByText('김민채')).toBeVisible();
  },
};
export const MissingName: Story = { args: { fullName: null } };
export const Disabled: Story = { args: { disabled: true } };
export const SingleCharacter: Story = { args: { fullName: '박준' } };
