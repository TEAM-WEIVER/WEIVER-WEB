import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './spinner';
const meta = {
  title: 'UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};
