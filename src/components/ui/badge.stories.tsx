import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';
const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: '면접 완료' },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const).map(
        (variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ),
      )}
    </div>
  ),
};
export const AsLink: Story = {
  render: () => (
    <Badge asChild variant="outline">
      <a href="/home">회원 홈</a>
    </Badge>
  ),
};
