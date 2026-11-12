import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, ArrowRight, ArrowLeft, Plus, Check } from 'lucide-react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'md', 'icon', 'icon-xs', 'icon-sm', 'icon-md'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">기본</Button>
      <Button variant="destructive">삭제</Button>
      <Button variant="outline">아웃라인</Button>
      <Button variant="secondary">보조</Button>
      <Button variant="ghost">마우스 호버시 이펙트</Button>
      <Button variant="link">링크</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="xs">XS 버튼</Button>
      <Button size="sm">Small 버튼</Button>
      <Button size="default">Default 버튼</Button>
      <Button size="md">Medium 버튼</Button>
    </div>
  ),
};

export const WithIconLeft: Story = {
  name: '아이콘 왼쪽',
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="xs">
          <Search />
          XS 버튼
        </Button>
        <Button size="sm">
          <Search />
          Small 버튼
        </Button>
        <Button size="md">
          <Search />
          Medium 버튼
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm">
          <Plus />
          추가하기
        </Button>
        <Button variant="secondary" size="sm">
          <Check />
          확인
        </Button>
      </div>
    </div>
  ),
};

export const WithIconRight: Story = {
  name: '아이콘 오른쪽',
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="xs">
          XS 버튼
          <ArrowRight />
        </Button>
        <Button size="sm">
          Small 버튼
          <ArrowRight />
        </Button>
        <Button size="md">
          Medium 버튼
          <ArrowRight />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm">
          다음 단계
          <ArrowRight />
        </Button>
        <Button variant="ghost" size="sm">
          <ArrowLeft />
          이전
        </Button>
      </div>
    </div>
  ),
};

export const IconOnly: Story = {
  name: '아이콘 버튼',
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="icon-xs">
        <Search />
      </Button>
      <Button size="icon-sm">
        <Search />
      </Button>
      <Button size="icon-md">
        <Search />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
