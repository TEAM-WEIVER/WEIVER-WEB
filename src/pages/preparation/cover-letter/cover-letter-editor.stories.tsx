import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';

import { CoverLetterEditor } from './cover-letter-editor';

const existingQuestion = {
  id: 'motivation',
  question: '해당 직무에 지원하게 된 계기와 입사 후 이루고자 하는 목표를 기술해주세요.',
  answer: '사용자가 겪는 문제를 발견하고 더 편리한 서비스로 개선하고 싶습니다.',
};

const anotherQuestion = {
  id: 'experience',
  question: '지원 직무와 관련된 도전 경험과 이를 극복한 과정을 기술해주세요.',
  answer: '팀 프로젝트에서 사용성 테스트를 진행하고 개선점을 반영했습니다.',
};

const meta = {
  title: 'Pages/Documents/CoverLetter',
  component: CoverLetterEditor,
  parameters: { layout: 'fullscreen' },
  decorators: [withPreparationHeader],
  args: { onSaveDraft: fn() },
} satisfies Meta<typeof CoverLetterEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithEntries: Story = {
  name: '작성 예시',
  args: { initialQuestions: [existingQuestion, anotherQuestion] },
};

export const Empty: Story = {
  name: '빈 화면',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '자기소개서', level: 1 })).toBeVisible();
    await expect(canvas.getByText('등록된 문항이 없습니다.')).toBeVisible();
    await expect(canvas.getByText('자기소개서', { selector: '[aria-current]' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '0',
    );
    await expect(canvas.getByRole('button', { name: '임시 저장' })).toBeVisible();
  },
};

export const AddingQuestion: Story = {
  name: '문항 추가',
  args: { initialQuestions: [existingQuestion, anotherQuestion], onSaveDraft: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '문항 추가' }));
    const form = within(canvas.getByRole('form', { name: '문항 정보 입력' }));
    const question = form.getByRole('textbox', { name: /문항 내용/ });
    const answer = form.getByRole('textbox', { name: /자기소개서 본문 내용/ });
    const save = form.getByRole('button', { name: '저장' });

    await expect(question).toHaveFocus();
    await expect(question).toBeRequired();
    await expect(answer).toBeRequired();
    await expect(
      canvas.getByRole('button', { name: `${existingQuestion.question} 수정` }),
    ).toBeDisabled();
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '66',
    );
    await expect(answer).toHaveAttribute('maxlength', '1500');
    await expect(form.getByText('0 / 1,500자')).toBeVisible();
    await expect(answer).toHaveAccessibleDescription('0 / 1,500자');
    await userEvent.type(answer, '지원합니다.');
    await expect(form.getByText('6 / 1,500자')).toBeVisible();
    await expect(answer).toHaveAccessibleDescription('6 / 1,500자');
    await expect(save).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      questions: [
        existingQuestion,
        anotherQuestion,
        { id: expect.any(String), question: '', answer: '지원합니다.' },
      ],
    });
    await expect(answer).toHaveValue('지원합니다.');
  },
};

export const EditingQuestion: Story = {
  name: '문항 편집',
  args: { initialQuestions: [existingQuestion, anotherQuestion], onSaveDraft: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: `${existingQuestion.question} 수정` }),
    );
    const form = within(canvas.getByRole('form', { name: '문항 정보 입력' }));
    const question = form.getByRole('textbox', { name: /문항 내용/ });
    const answer = form.getByRole('textbox', { name: /자기소개서 본문 내용/ });

    await expect(question).toHaveFocus();
    await expect(question).toHaveValue(existingQuestion.question);
    await expect(answer).toHaveValue(existingQuestion.answer);
    await userEvent.clear(question);
    await userEvent.type(question, '입사 후 어떤 목표를 이루고 싶나요?');
    await userEvent.clear(answer);
    await userEvent.type(answer, '사용성을 개선하겠습니다.');
    await expect(form.getByText('13 / 1,500자')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      questions: [
        {
          ...existingQuestion,
          question: '입사 후 어떤 목표를 이루고 싶나요?',
          answer: '사용성을 개선하겠습니다.',
        },
        anotherQuestion,
      ],
    });
    await expect(form.getByRole('button', { name: '저장' })).toBeVisible();
  },
};

export const QuestionActions: Story = {
  name: '문항 추가·수정·삭제',
  args: { onSaveDraft: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const add = canvas.getByRole('button', { name: '문항 추가' });
    const draft = canvas.getByRole('button', { name: '임시 저장' });

    await userEvent.click(add);
    let form = within(canvas.getByRole('form', { name: '문항 정보 입력' }));
    const question = '지원한 이유는 무엇인가요?';
    const answer = '사용자가 겪는 문제를 해결하고 싶습니다.';
    await userEvent.type(form.getByRole('textbox', { name: /문항 내용/ }), question);
    await userEvent.type(form.getByRole('textbox', { name: /자기소개서 본문 내용/ }), answer);
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(canvas.getByRole('heading', { name: question })).toBeVisible();
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '100',
    );
    await expect(args.onSaveDraft).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: `${question} 수정` }));
    form = within(canvas.getByRole('form', { name: '문항 정보 입력' }));
    await userEvent.clear(form.getByRole('textbox', { name: /자기소개서 본문 내용/ }));
    await userEvent.click(form.getByRole('button', { name: '취소' }));
    await expect(canvas.getByText(answer)).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: `${question} 수정` }));
    form = within(canvas.getByRole('form', { name: '문항 정보 입력' }));
    const revisedAnswer = '서비스 접근성을 개선하겠습니다.';
    const answerField = form.getByRole('textbox', { name: /자기소개서 본문 내용/ });
    await userEvent.clear(answerField);
    await userEvent.type(answerField, revisedAnswer);
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(canvas.getByText(revisedAnswer)).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: `${question} 삭제` }));
    await expect(canvas.getByText('등록된 문항이 없습니다.')).toBeVisible();
    await userEvent.click(draft);
    await expect(args.onSaveDraft).toHaveBeenCalledWith({ questions: [] });
  },
};
