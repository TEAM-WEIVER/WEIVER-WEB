import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { LoginFooter } from './login-footer';
const meta = {
  title: 'Auth/LoginFooter',
  component: LoginFooter,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof LoginFooter>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
