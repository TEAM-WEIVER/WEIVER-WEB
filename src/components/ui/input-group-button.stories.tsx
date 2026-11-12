import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';
const meta = {
  title: 'UI/InputGroupButton',
  component: InputGroupButton,
  tags: ['autodocs'],
  args: { children: '검색', onClick: fn() },
  argTypes: { size: { control: 'select', options: ['xs', 'sm', 'icon-xs', 'icon-sm'] } },
  decorators: [
    (Story) => (
      <InputGroup>
        <InputGroupInput aria-label="검색어" />
        <InputGroupAddon align="inline-end">
          <Story />
        </InputGroupAddon>
      </InputGroup>
    ),
  ],
} satisfies Meta<typeof InputGroupButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Icon: Story = {
  args: { size: 'icon-xs', 'aria-label': '검색', children: <Search /> },
};
export const Disabled: Story = { args: { disabled: true } };
