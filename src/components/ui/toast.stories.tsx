import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './toast';
const meta = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: {
    toast: {
      id: 'preview',
      type: 'success',
      title: '저장했습니다.',
      description: '변경 내용이 반영되었습니다.',
      duration: 60000,
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '종류별 표시 예시입니다. 실제 닫기·자동 제거 동작은 Common/ToastContainer에서 확인합니다.',
      },
    },
  },
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Success: Story = {};
export const Failure: Story = {
  args: {
    toast: {
      id: 'failure',
      type: 'error',
      title: '저장하지 못했습니다.',
      description: '잠시 후 다시 시도해주세요.',
      duration: 60000,
    },
  },
};
export const Warning: Story = {
  args: {
    toast: { id: 'warning', type: 'warning', title: '입력 내용을 확인해주세요.', duration: 60000 },
  },
};
export const Info: Story = {
  args: {
    toast: { id: 'info', type: 'info', title: '리포트를 준비하고 있습니다.', duration: 60000 },
  },
};

export const LongContent: Story = {
  args: {
    toast: {
      id: 'long',
      type: 'info',
      title: '아주긴알림제목이공백없이이어져도화면밖으로넘치지않아야합니다'.repeat(3),
      description: 'https://example.com/' + 'long-path'.repeat(20),
      duration: 60000,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
