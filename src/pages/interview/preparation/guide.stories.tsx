import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { InterviewDeviceState } from '@/hooks/use-interview-device-checks';

import { InterviewPreparationGuide, type InterviewPreparationGuideProps } from './guide';

const idle: InterviewDeviceState = {
  status: 'idle',
  stream: null,
  deviceId: 'default',
  devices: [],
  error: null,
};

function GuideExample({
  deniedCamera = false,
  silentMicrophone = false,
  ...args
}: InterviewPreparationGuideProps & { deniedCamera?: boolean; silentMicrophone?: boolean }) {
  const [camera, setCamera] = useState(idle);
  const [microphone, setMicrophone] = useState(idle);
  const [hasSound, setHasSound] = useState(false);
  const level = useRef(0);
  const attempts = useRef(0);
  return (
    <InterviewPreparationGuide
      {...args}
      devices={{
        camera,
        microphone,
        hasSound,
        level,
        requestCamera: async (deviceId = 'default') => {
          attempts.current += 1;
          setCamera(
            deniedCamera && attempts.current === 1
              ? {
                  ...idle,
                  status: 'error',
                  error: '브라우저의 사이트 설정에서 카메라 접근을 허용한 뒤 다시 확인해주세요.',
                }
              : { ...idle, status: 'ready', deviceId },
          );
        },
        requestMicrophone: async (deviceId = 'default') => {
          setMicrophone({ ...idle, status: 'ready', deviceId });
          setHasSound(!silentMicrophone);
          level.current = silentMicrophone ? 0 : 0.65;
        },
      }}
    />
  );
}

const meta = {
  title: 'Pages/Interviews/PreparationGuide',
  component: InterviewPreparationGuide,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '헤더 없는 전체 화면 면접 준비 가이드. 스토리의 장비 확인은 예시 동작이며 실제 권한 요청·녹음·면접 연결을 하지 않습니다. 실제 페이지는 각 장비를 별도로 확인하고 마이크 소리 입력까지 감지합니다.',
      },
    },
  },
  args: {
    devices: {
      camera: idle,
      microphone: idle,
      hasSound: false,
      level: { current: 0 },
      requestCamera: fn(async () => {}),
      requestMicrophone: fn(async () => {}),
    },
    onExit: fn(),
    onStart: fn(),
  },
  render: (args) => <GuideExample {...args} />,
} satisfies Meta<typeof InterviewPreparationGuide>;
export default meta;
type Story = StoryObj<typeof meta>;

async function next(canvas: ReturnType<typeof within>) {
  const button = canvas.getByRole('button', { name: '다음', exact: true });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}

async function checkDevices(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: '시작하기' }));
  await waitFor(() => expect(canvas.getByRole('heading', { name: /카메라 사용을/ })).toBeVisible());
  await expect(canvas.getByRole('button', { name: '다음' })).toBeDisabled();
  await userEvent.click(canvas.getByRole('button', { name: '카메라 연결하기' }));
  await next(canvas);
  await waitFor(() => expect(canvas.getByRole('heading', { name: /마이크 소리를/ })).toBeVisible());
  await expect(canvas.getByRole('button', { name: '다음' })).toBeDisabled();
  await userEvent.click(canvas.getByRole('button', { name: '마이크 테스트' }));
  await next(canvas);
  await waitFor(() => expect(canvas.getByRole('heading', { name: /첫 번째는/ })).toBeVisible());
}

export const Welcome: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await expect(canvas.queryByText('AI 모의면접', { exact: true })).not.toBeInTheDocument();
  },
};
export const Walkthrough: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await checkDevices(canvasElement);
    await next(canvas);
    await waitFor(() => expect(canvas.getByRole('heading', { name: /두 번째는/ })).toBeVisible());
    await next(canvas);
    await waitFor(() => expect(canvas.getByRole('checkbox')).toBeVisible());
    await expect(canvas.getByRole('button', { name: 'AI 면접 시작' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('checkbox'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'AI 면접 시작' })).toBeEnabled());
    await userEvent.click(canvas.getByRole('button', { name: 'AI 면접 시작' }));
    await expect(args.onStart).toHaveBeenCalledOnce();
  },
};
export const CameraPermissionDenied: Story = {
  render: (args) => <GuideExample {...args} deniedCamera />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '시작하기' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '카메라 연결하기' })).toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('button', { name: '카메라 연결하기' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('카메라 접근을 허용');
    await expect(canvas.getByRole('button', { name: '다음' })).toBeDisabled();
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '카메라 연결하기' })).toBeEnabled(),
    );
    await userEvent.click(canvas.getByRole('button', { name: '카메라 연결하기' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: '다음' })).toBeEnabled());
  },
};
export const MicrophoneWithoutInput: Story = {
  render: (args) => <GuideExample {...args} silentMicrophone />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '시작하기' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '카메라 연결하기' })).toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('button', { name: '카메라 연결하기' }));
    await next(canvas);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '마이크 테스트' })).toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('button', { name: '마이크 테스트' }));
    await expect(canvas.getByRole('button', { name: '다음' })).toBeDisabled();
    await expect(canvas.getByText('소리를 확인해주세요')).toBeVisible();
  },
};
export const UnconnectedInterview: Story = {
  args: { onStart: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await checkDevices(canvasElement);
    await next(canvas);
    await next(canvas);
    await waitFor(() => expect(canvas.getByRole('checkbox')).toBeVisible());
    await userEvent.click(canvas.getByRole('checkbox'));
    await expect(canvas.getByRole('button', { name: 'AI 면접 시작' })).toBeDisabled();
    await expect(canvas.getByText('실제 면접 연결 기능은 준비 중이에요.')).toBeVisible();
  },
};
export const StartFailure: Story = {
  args: {
    onStart: fn(async () => {
      throw new Error('unavailable');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await checkDevices(canvasElement);
    await next(canvas);
    await next(canvas);
    await waitFor(() => expect(canvas.getByRole('checkbox')).toBeVisible());
    await userEvent.click(canvas.getByRole('checkbox'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'AI 면접 시작' })).toBeEnabled());
    await userEvent.click(canvas.getByRole('button', { name: 'AI 면접 시작' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('면접을 시작하지 못했어요.');
  },
};
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
