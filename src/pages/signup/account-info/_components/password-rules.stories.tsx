import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordRules } from './password-rules';
const meta = {
  title: 'Auth/PasswordRules',
  component: PasswordRules,
  tags: ['autodocs'],
  args: { password: '' },
} satisfies Meta<typeof PasswordRules>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const TooShort: Story = { args: { password: 'Ab1!' } };
export const MissingSymbol: Story = { args: { password: 'Abcdef123' } };
export const Satisfied: Story = { args: { password: 'Demo1234!' } };
