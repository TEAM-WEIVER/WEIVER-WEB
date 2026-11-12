import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton';
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: { className: 'h-6 w-48' },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Profile: Story = {
  render: () => (
    <div role="status" aria-label="프로필 로딩" className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  ),
};
export const Card: Story = {
  render: () => (
    <div role="status" aria-label="카드 로딩" className="flex w-80 flex-col gap-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  ),
};
