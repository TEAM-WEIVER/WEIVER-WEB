import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';
import { resumeProgressSections } from './_model/resume-progress';
import type { ResumeDraft } from './_model/resume-sections';
import ResumeEditor from './page';

const sampleCareer = {
  company: '위버',
  position: '서비스 기획자',
  employmentType: '정규직',
  employmentStatus: '퇴사',
  startMonth: '2023.03',
  endMonth: '2024.08',
  duties: '사용자 인터뷰를 진행하고 지원 준비 화면을 기획했습니다.',
};

const sampleDraft = {
  education: [
    {
      level: '대학교 (4년제)',
      school: '위버대학교',
      major: '컴퓨터공학과',
      grade: '4.1',
      gradeScale: '4.5',
      startMonth: '2019.03',
      endMonth: '2023.02',
      status: '졸업',
    },
  ],
  career: [
    sampleCareer,
    {
      ...sampleCareer,
      company: '스튜디오 모아',
      employmentType: '인턴',
      startMonth: '2022.03',
      endMonth: '2022.08',
    },
  ],
  certifications: [
    { name: 'TOEIC Speaking', issuer: 'ETS', issuedDate: '2024.05.20', score: 'Advanced Low' },
  ],
  awards: [
    {
      name: '캡스톤 디자인 우수상',
      organization: '위버대학교',
      awardedDate: '2022.11.30',
      description: '팀과 함께 취업 준비자를 위한 일정 관리 서비스를 제작했습니다.',
    },
  ],
} satisfies ResumeDraft;

const meta = {
  title: 'Pages/Documents/Resume',
  component: ResumeEditor,
  parameters: { layout: 'fullscreen' },
  decorators: [withPreparationHeader],
  args: { onSaveDraft: fn() },
} satisfies Meta<typeof ResumeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithEntries: Story = {
  name: '작성 예시',
  args: { initialDraft: sampleDraft },
};

export const Empty: Story = {
  name: '빈 화면',
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('form', { name: '학력 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '경력사항 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '자격증 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '수상이력 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '0',
    );
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      education: [],
      career: [],
      certifications: [],
      awards: [],
    });
  },
};

export const Editing: Story = {
  name: '편집 중',
  args: { initialDraft: sampleDraft },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학과 수정' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: '위버 수정' }));
  },
};

export const OpenMonthPicker: Story = {
  name: '월 선택 열림',
  args: { initialDraft: sampleDraft },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학과 수정' }),
    );
    await userEvent.click(canvas.getByRole('combobox', { name: '입학년월' }));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('dialog', { name: '입학년월 달력' }),
    ).toBeVisible();
  },
};

export const OpenDatePicker: Story = {
  name: '날짜 선택 열림',
  args: { initialDraft: sampleDraft },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'TOEIC Speaking 수정' }));
    await userEvent.click(canvas.getByRole('combobox', { name: '취득일' }));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('dialog', { name: '취득일 달력' }),
    ).toBeVisible();
  },
};

export const SelectKeyboard: Story = {
  name: '드롭다운 키보드 조작',
  play: async ({ canvas, canvasElement, userEvent }) => {
    const form = within(canvas.getByRole('form', { name: '학력 정보 입력' }));
    const trigger = form.getByRole('combobox', { name: '학력구분' });
    const body = within(canvasElement.ownerDocument.body);

    await expect(canvas.getAllByRole('combobox')).toHaveLength(11);
    await expect(trigger).toHaveTextContent('학력구분 선택');
    await expect(trigger).toBeRequired();
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute('aria-invalid', 'true');
    await expect(trigger).toHaveAccessibleDescription('항목을 선택해주세요.');

    await userEvent.keyboard('{ArrowDown}');
    const listbox = await body.findByRole('listbox', { name: '학력구분' });
    await waitFor(() =>
      expect(within(listbox).getByRole('option', { name: '고등학교' })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveTextContent('대학교 (2,3년제)');
    await expect(trigger).toHaveAttribute('aria-invalid', 'false');
    await expect(trigger).not.toHaveAttribute('aria-describedby');

    await userEvent.keyboard('{Enter}');
    const reopenedList = within(await body.findByRole('listbox', { name: '학력구분' }));
    await expect(reopenedList.getByRole('option', { name: '대학교 (2,3년제)' })).toHaveAttribute(
      'data-state',
      'checked',
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const AddEditAndDelete: Story = {
  name: '항목 추가·수정·삭제',
  args: { initialDraft: { ...sampleDraft, certifications: [] } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const progress = canvas.getByRole('progressbar', { name: '작성 진행률' });
    const section = within(canvas.getByRole('region', { name: '자격증' }));
    await expect(progress).toHaveAttribute('value', '75');
    await userEvent.click(section.getByRole('button', { name: '자격증 추가' }));
    const form = within(section.getByRole('form', { name: '자격증 정보 입력' }));
    await userEvent.type(form.getByRole('textbox', { name: '자격증명' }), '정보처리기사');
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(progress).toHaveAttribute('value', '75');
    await userEvent.click(form.getByRole('combobox', { name: '취득일' }));
    const body = within(canvasElement.ownerDocument.body);
    const calendar = within(await body.findByRole('dialog', { name: '취득일 달력' }));
    await userEvent.click(calendar.getByRole('combobox', { name: '연도 선택' }));
    await userEvent.click(body.getByRole('option', { name: '2025년' }));
    await userEvent.click(calendar.getByRole('combobox', { name: '월 선택' }));
    await userEvent.click(body.getByRole('option', { name: '6월' }));
    await userEvent.click(calendar.getByRole('button', { name: '2025년 6월 20일' }));
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(section.getByRole('heading', { name: '정보처리기사' })).toBeVisible();
    await expect(progress).toHaveAttribute('value', '100');

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 수정' }));
    const editForm = within(section.getByRole('form', { name: '자격증 정보 수정' }));
    await expect(editForm.getByRole('textbox', { name: '자격증명' })).toHaveValue('정보처리기사');
    await userEvent.type(editForm.getByRole('textbox', { name: '발행처' }), '한국산업인력공단');
    await userEvent.click(editForm.getByRole('button', { name: '저장' }));
    await expect(section.getByText('한국산업인력공단')).toBeVisible();
    await expect(progress).toHaveAttribute('value', '100');

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 수정' }));
    const editAgain = within(section.getByRole('form', { name: '자격증 정보 수정' }));
    await userEvent.clear(editAgain.getByRole('textbox', { name: '발행처' }));
    await userEvent.click(editAgain.getByRole('button', { name: '취소' }));
    await expect(section.getByText('한국산업인력공단')).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 삭제' }));
    await expect(section.queryByRole('heading', { name: '정보처리기사' })).not.toBeInTheDocument();
    await expect(progress).toHaveAttribute('value', '75');
    await expect(canvas.getByRole('heading', { name: '캡스톤 디자인 우수상' })).toBeVisible();
  },
};

export const EmploymentStatus: Story = {
  name: '재직중·퇴사 전환',
  args: { initialDraft: sampleDraft },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);

    async function selectStatus(trigger: HTMLElement, status: string) {
      await userEvent.click(trigger);
      const listbox = within(await body.findByRole('listbox', { name: '재직상태' }));
      await userEvent.click(listbox.getByRole('option', { name: status }));
    }

    const section = within(canvas.getByRole('region', { name: '경력사항' }));
    await userEvent.click(section.getByRole('button', { name: '위버 수정' }));
    await userEvent.click(section.getByRole('button', { name: '스튜디오 모아 수정' }));

    const [firstForm, secondForm] = section.getAllByRole('form', { name: '경력사항 정보 수정' });
    const first = within(firstForm);
    const second = within(secondForm);
    const endMonth = first.getByRole('combobox', { name: '퇴사년월' });
    const otherEndMonth = second.getByRole('combobox', { name: '퇴사년월' });
    const status = first.getByRole('combobox', { name: '재직상태' });

    await expect(endMonth).toHaveTextContent('2024.08');
    await selectStatus(status, '재직중');
    await expect(endMonth).toBeDisabled();
    await expect(endMonth).not.toBeRequired();
    await expect(endMonth).toHaveTextContent('YYYY.MM');
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(otherEndMonth).toBeEnabled();
    await expect(otherEndMonth).toHaveTextContent('2022.08');
    first.getByRole('combobox', { name: '입사년월' }).focus();
    await userEvent.tab();
    await expect(first.getByRole('textbox', { name: '담당업무' })).toHaveFocus();

    await selectStatus(status, '퇴사');
    await expect(endMonth).toBeEnabled();
    await expect(endMonth).toBeRequired();
    await userEvent.click(first.getByRole('button', { name: '저장' }));
    await expect(endMonth).toHaveFocus();
    await expect(endMonth).toHaveAttribute('aria-invalid', 'true');
    await expect(first.getByText('필수 입력 항목입니다.')).toBeVisible();

    await selectStatus(status, '재직중');
    await expect(endMonth).toHaveAttribute('aria-invalid', 'false');
    await expect(first.queryByText('필수 입력 항목입니다.')).not.toBeInTheDocument();
    await userEvent.click(first.getByRole('button', { name: '저장' }));
    await expect(section.getByText('2023.03 ~ 재직중')).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '위버 수정' }));
    const [reopened] = section.getAllByRole('form', { name: '경력사항 정보 수정' });
    const reopenedForm = within(reopened);
    await selectStatus(reopenedForm.getByRole('combobox', { name: '재직상태' }), '퇴사');
    await userEvent.click(reopenedForm.getByRole('combobox', { name: '퇴사년월' }));
    const calendar = within(await body.findByRole('dialog', { name: '퇴사년월 달력' }));
    await userEvent.click(calendar.getByRole('combobox', { name: '연도 선택' }));
    await userEvent.click(body.getByRole('option', { name: '2025년' }));
    await userEvent.click(calendar.getByRole('button', { name: '2025년 1월' }));
    await userEvent.click(reopenedForm.getByRole('button', { name: '저장' }));
    await expect(section.getByText('2023.03 ~ 2025.01')).toBeVisible();
    await expect(otherEndMonth).toHaveTextContent('2022.08');
  },
};

export const SaveDraftWithEdits: Story = {
  name: '편집 중 임시 저장',
  args: {
    initialDraft: {
      ...sampleDraft,
      career: [{ ...sampleCareer, employmentStatus: '재직중' }, sampleDraft.career[1]],
    },
  },
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    const career = within(canvas.getByRole('region', { name: '경력사항' }));
    await userEvent.click(career.getByRole('button', { name: '스튜디오 모아 수정' }));
    const careerForm = within(career.getByRole('form', { name: '경력사항 정보 수정' }));
    const company = careerForm.getByRole('textbox', { name: '회사명' });
    await userEvent.clear(company);
    await userEvent.type(company, '모아 스튜디오');
    await userEvent.click(careerForm.getByRole('combobox', { name: '경력형태' }));
    const body = within(canvasElement.ownerDocument.body);
    const careerTypes = within(await body.findByRole('listbox', { name: '경력형태' }));
    await userEvent.click(careerTypes.getByRole('option', { name: '프리랜서' }));

    await userEvent.click(canvas.getByRole('button', { name: '수상이력 추가' }));
    const award = within(canvas.getByRole('form', { name: '수상이력 정보 입력' }));
    await userEvent.type(award.getByRole('textbox', { name: '수상명' }), '서비스 기획 공모전');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));

    await expect(args.onSaveDraft).toHaveBeenCalledOnce();
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      ...sampleDraft,
      career: [
        { ...sampleCareer, employmentStatus: '재직중', endMonth: '' },
        { ...sampleDraft.career[1], company: '모아 스튜디오', employmentType: '프리랜서' },
      ],
      awards: [
        ...sampleDraft.awards,
        { name: '서비스 기획 공모전', organization: '', awardedDate: '', description: '' },
      ],
    });
    await expect(award.getByRole('textbox', { name: '수여기관' })).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  },
};

export const CalendarSelection: Story = {
  name: '달력 선택과 임시 저장',
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);
    const education = within(canvas.getByRole('form', { name: '학력 정보 입력' }));
    const startMonth = education.getByRole('combobox', { name: '입학년월' });

    await expect(education.queryByRole('textbox', { name: '입학년월' })).not.toBeInTheDocument();
    startMonth.focus();
    await userEvent.keyboard('2020.09');
    await expect(startMonth).toHaveTextContent('YYYY.MM');
    await userEvent.keyboard('{Enter}');
    const monthPicker = within(await body.findByRole('dialog', { name: '입학년월 달력' }));
    await userEvent.click(monthPicker.getByRole('combobox', { name: '연도 선택' }));
    await userEvent.click(body.getByRole('option', { name: '2020년' }));
    await userEvent.click(monthPicker.getByRole('button', { name: '2020년 9월' }));
    await expect(startMonth).toHaveTextContent('2020.09');
    await waitFor(() => expect(startMonth).toHaveFocus());

    const award = within(canvas.getByRole('form', { name: '수상이력 정보 입력' }));
    const awardDate = award.getByRole('combobox', { name: '수상일' });
    await userEvent.click(awardDate);
    const dayPicker = within(await body.findByRole('dialog', { name: '수상일 달력' }));
    await userEvent.click(dayPicker.getByRole('combobox', { name: '연도 선택' }));
    await userEvent.click(body.getByRole('option', { name: '2024년' }));
    await userEvent.click(dayPicker.getByRole('combobox', { name: '월 선택' }));
    await userEvent.click(body.getByRole('option', { name: '2월' }));
    await userEvent.click(dayPicker.getByRole('button', { name: '2024년 2월 29일' }));
    await expect(awardDate).toHaveTextContent('2024.02.29');
    await waitFor(() => expect(awardDate).toHaveFocus());

    await userEvent.click(awardDate);
    await userEvent.keyboard('{Escape}');
    await expect(awardDate).toHaveTextContent('2024.02.29');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      education: [
        {
          level: '',
          school: '',
          major: '',
          grade: '',
          gradeScale: '',
          startMonth: '2020.09',
          endMonth: '',
          status: '',
        },
      ],
      career: [],
      certifications: [],
      awards: [{ name: '', organization: '', awardedDate: '2024.02.29', description: '' }],
    });
  },
};

export const PartialProgress: Story = {
  name: '섹션별 진행률',
  args: { initialDraft: { ...sampleDraft, career: [], certifications: [], awards: [] } },
  play: async ({ canvas, userEvent }) => {
    const progress = canvas.getByRole('progressbar');
    await expect(progress).toHaveAttribute('value', '25');
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학과 수정' }),
    );
    const form = within(canvas.getByRole('form', { name: '학력 정보 수정' }));
    await userEvent.clear(form.getByRole('textbox', { name: '학교명' }));
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(progress).toHaveAttribute('value', '25');
    await userEvent.click(form.getByRole('button', { name: '취소' }));
    await expect(progress).toHaveAttribute('value', '25');
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학과 삭제' }),
    );
    await expect(progress).toHaveAttribute('value', '0');
    const documents = within(canvas.getByRole('navigation', { name: '작성 필요 서류' }));
    await expect(documents.getByText('이력서')).toHaveTextContent('미작성');
  },
};

export const ConfiguredSections: Story = {
  name: '진행률 대상 섹션 설정',
  args: {
    initialDraft: { ...sampleDraft, awards: [] },
    progressSections: resumeProgressSections.map((section) => ({
      ...section,
      included: section.id !== 'awards',
    })),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('value', '100');
  },
};
