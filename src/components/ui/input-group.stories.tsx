import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, Eye } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
} from './input-group';

const meta: Meta<typeof InputGroup> = {
  title: 'UI/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

// 기본 예시들
export const WithIcon: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="검색어를 입력하세요" />
    </InputGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
};

// InputGroupButton 스토리 (Controls로 size 조절 가능)
const InputGroupButtonMeta: Meta<typeof InputGroupButton> = {
  title: 'UI/InputGroup/Button',
  component: InputGroupButton,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'icon-xs', 'icon-sm'],
      description: '버튼 크기',
    },
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: '버튼 스타일',
    },
  },
  decorators: [
    (Story) => (
      <InputGroup>
        <InputGroupInput placeholder="입력..." />
        <InputGroupAddon align="inline-end">
          <Story />
        </InputGroupAddon>
      </InputGroup>
    ),
  ],
};

export const InputWithButton: StoryObj<typeof InputGroupButton> = {
  ...InputGroupButtonMeta,
  args: {
    size: 'xs',
    variant: 'ghost',
    children: '검색',
  },
  render: (args) => <InputGroupButton {...args} />,
};

export const InputWithIconButton: StoryObj<typeof InputGroupButton> = {
  ...InputGroupButtonMeta,
  args: {
    size: 'icon-xs',
    variant: 'ghost',
    children: <Eye className="size-4" />,
  },
  render: (args) => <InputGroupButton {...args} />,
};
