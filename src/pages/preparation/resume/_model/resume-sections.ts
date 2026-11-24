import type { ResumeRow, ResumeSectionConfig, ResumeValues } from './resume-types';

function defineSection<const Name extends string>(config: ResumeSectionConfig<Name>) {
  return config;
}

export const resumeSections = {
  education: defineSection({
    title: '학력',
    description: '최종 학력부터 순서대로 입력해주세요.',
    fields: [
      {
        name: 'level',
        label: '학력구분',
        placeholder: '학력구분 선택',
        width: 'xl:col-span-6',
        required: true,
        options: [
          '고등학교',
          '대학교 (2,3년제)',
          '대학교 (4년제)',
          '대학원 (석사)',
          '대학원 (박사)',
        ],
      },
      {
        name: 'school',
        label: '학교명',
        placeholder: '학교명을 입력해주세요.',
        width: 'xl:col-span-10',
        required: true,
      },
      {
        name: 'major',
        label: '전공',
        placeholder: '전공명을 입력해주세요.',
        width: 'xl:col-span-8',
        required: true,
      },
      {
        name: 'grade',
        label: '학점',
        placeholder: '예: 4.3',
        width: 'xl:col-span-3',
        format: 'decimal',
        required: true,
      },
      {
        name: 'gradeScale',
        label: '만점',
        placeholder: '만점 선택',
        width: 'xl:col-span-3',
        required: true,
        options: ['4.3', '4.5'],
      },
      {
        name: 'startMonth',
        label: '입학년월',
        placeholder: 'YYYY.MM',
        width: 'xl:col-span-5',
        format: 'month',
        required: true,
      },
      {
        name: 'endMonth',
        label: '졸업년월',
        placeholder: 'YYYY.MM',
        width: 'xl:col-span-5',
        format: 'month',
        required: true,
      },
      {
        name: 'status',
        label: '졸업상태',
        placeholder: '졸업상태 선택',
        width: 'xl:col-span-8',
        required: true,
        options: ['재학', '휴학', '졸업', '졸업예정'],
      },
    ],
    summarize: (values) => ({
      title: [values.level, values.school, values.major].join(' · '),
      details: [
        `${values.startMonth} ~ ${values.endMonth} · ${values.status}`,
        `학점 ${values.grade} / ${values.gradeScale}`,
      ],
    }),
  }),
  career: defineSection({
    title: '경력사항',
    noHistoryLabel: '경력 없음',
    description: '최근 경력부터 순서대로 입력해주세요.',
    fields: [
      {
        name: 'company',
        label: '회사명',
        placeholder: '회사명을 입력해주세요.',
        width: 'xl:col-span-8',
        required: true,
      },
      {
        name: 'position',
        label: '직무/직급',
        placeholder: '직무 및 직급을 입력해주세요.',
        width: 'xl:col-span-10',
        required: true,
      },
      {
        name: 'employmentType',
        label: '경력형태',
        placeholder: '경력형태 선택',
        width: 'xl:col-span-6',
        required: true,
        options: ['정규직', '계약직', '인턴', '프리랜서', '병역특례', '아르바이트'],
      },
      {
        name: 'employmentStatus',
        label: '재직상태',
        placeholder: '재직상태 선택',
        width: 'xl:col-span-6',
        required: true,
        options: ['재직중', '퇴사'],
      },
      {
        name: 'startMonth',
        label: '입사년월',
        placeholder: 'YYYY.MM',
        width: 'xl:col-span-9',
        format: 'month',
        required: true,
      },
      {
        name: 'endMonth',
        label: '퇴사년월',
        placeholder: 'YYYY.MM',
        width: 'xl:col-span-9',
        format: 'month',
        required: true,
        disabledWhen: { name: 'employmentStatus', value: '재직중' },
      },
      {
        name: 'duties',
        label: '담당업무',
        placeholder: '담당한 업무와 주요 성과를 간단하게 입력해주세요.',
        width: 'sm:col-span-2 xl:col-span-24',
        multiline: true,
        required: true,
      },
    ],
    summarize: (values) => ({
      title: values.company,
      details: [
        `${values.position} · ${values.employmentType}`,
        `${values.startMonth} ~ ${values.employmentStatus === '재직중' ? '재직중' : values.endMonth}`,
      ],
      description: values.duties,
    }),
  }),
  certifications: defineSection({
    title: '자격증',
    noHistoryLabel: '보유 자격증 없음',
    description: '보유한 자격증 및 공인 시험 정보를 입력해주세요.',
    fields: [
      {
        name: 'name',
        label: '자격증명',
        placeholder: '자격증명을 입력해주세요.',
        width: 'xl:col-span-14',
        required: true,
      },
      {
        name: 'issuer',
        label: '발행처',
        placeholder: '발행기관을 입력해주세요.',
        width: 'xl:col-span-10',
      },
      {
        name: 'issuedDate',
        label: '취득일',
        placeholder: 'YYYY.MM.DD',
        width: 'xl:col-span-8',
        format: 'date',
        required: true,
      },
      {
        name: 'score',
        label: '점수/등급',
        placeholder: '예: Advanced Low, 850점, 1급',
        width: 'xl:col-span-16',
      },
    ],
    summarize: (values) => ({
      title: values.name,
      details: [
        [values.score, values.issuedDate].filter(Boolean).join(' · '),
        values.issuer,
      ].filter(Boolean),
    }),
  }),
  awards: defineSection({
    title: '수상이력',
    noHistoryLabel: '수상 이력 없음',
    description: '주요 수상 및 공모전 경험을 입력해주세요.',
    fields: [
      {
        name: 'name',
        label: '수상명',
        placeholder: '수상명을 입력해주세요.',
        width: 'xl:col-span-14',
        required: true,
      },
      {
        name: 'organization',
        label: '수여기관',
        placeholder: '수여기관을 입력해주세요.',
        width: 'xl:col-span-10',
        required: true,
      },
      {
        name: 'awardedDate',
        label: '수상일',
        placeholder: 'YYYY.MM.DD',
        width: 'xl:col-span-8',
        format: 'date',
        required: true,
      },
      {
        name: 'description',
        label: '수상내용',
        placeholder: '수상한 활동 및 주요 성과를 간단히 입력해주세요.',
        width: 'xl:col-span-16',
        multiline: true,
        required: true,
      },
    ],
    summarize: (values) => ({
      title: values.name,
      details: [`${values.awardedDate} · ${values.organization}`],
      description: values.description,
    }),
  }),
};

export type ResumeSectionName = keyof typeof resumeSections;
export type OptionalResumeSectionName = Exclude<ResumeSectionName, 'education'>;
type ResumeNoHistory = { noHistory?: OptionalResumeSectionName[] };
type FieldName<Section extends ResumeSectionName> =
  (typeof resumeSections)[Section]['fields'][number]['name'];

export type ResumeDraft = ResumeNoHistory & {
  [Section in ResumeSectionName]: ResumeValues<FieldName<Section>>[];
};

export type ResumeRows = ResumeNoHistory & {
  [Section in ResumeSectionName]: ResumeRow<FieldName<Section>>[];
};
