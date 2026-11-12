import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, Eye } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
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
      <InputGroupInput aria-label="입력값" placeholder="검색어를 입력하세요" />
    </InputGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="입력값" placeholder="example.com" />
    </InputGroup>
  ),
};

export const InputWithButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput aria-label="검색어" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>검색</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
export const InputWithIconButton: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput aria-label="비밀번호" type="password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="비밀번호 보기">
          <Eye />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput aria-label="이메일" aria-invalid defaultValue="잘못된 이메일" />
    </InputGroup>
  ),
};
export const Disabled: Story = {
  render: () => (
    <InputGroup data-disabled>
      <InputGroupInput aria-label="검색어" disabled />
      <InputGroupAddon align="inline-end">
        <InputGroupButton disabled>검색</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
export const Multiline: Story = {
  render: () => (
    <InputGroup>
      <InputGroupTextarea aria-label="자기소개" placeholder="자기소개를 작성하세요" />
      <InputGroupAddon align="block-end">
        <InputGroupText>최대 500자</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};
