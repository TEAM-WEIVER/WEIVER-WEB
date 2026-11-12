import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HeaderProfileButton } from './header-profile-button';
const meta = {
  title: 'Common/HeaderProfileButton',
  component: HeaderProfileButton,
  tags: ['autodocs'],
  args: { givenName: '민수', onClick: fn() },
} satisfies Meta<typeof HeaderProfileButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const MissingName: Story = { args: { givenName: null } };
export const Disabled: Story = { args: { disabled: true } };
export const SingleCharacter: Story = { args: { givenName: '준' } };
