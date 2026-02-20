'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ArrowRight, Image as ImageIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormStepHeader } from '@/components/common/form-step-header';
import {
  TOTAL_STEPS,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getNextOnboardingStep,
  getOnboardingPath,
} from '@/lib/onboarding-flow';
import { resumeSchema, type ResumeData } from '@/schemas/onboarding';

/* ─── 섹션 제목 ─── */

function SectionTitle({ title, required }: { title: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3">
        <div className="h-7 w-1 bg-[var(--primary-700)]" />
        <h2 className="text-h3 text-[var(--text-primary)]">{title}</h2>
      </div>
      {required && <span className="text-h3 text-[var(--error)]">*</span>}
    </div>
  );
}

/* ─── 추가 버튼 ─── */

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-button1 flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <Plus size={20} />
      {label}
    </button>
  );
}

/* ─── 삭제 버튼 ─── */

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-3 right-3 rounded-full p-1 text-[var(--text-disabled)] transition-colors hover:bg-[var(--primary-200)] hover:text-[var(--text-tertiary)]"
    >
      <X size={18} />
    </button>
  );
}

/* ─── 필드 입력 ─── */

const fieldInputClass =
  'text-body2 h-12 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3 shadow-none placeholder:text-[var(--text-disabled)]';

const dropdownClass =
  'text-body2 h-12 w-full appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-5 py-3 text-[var(--text-primary)] outline-none';

/* ─── 메인 페이지 ─── */

const CURRENT_STEP = 'resume' as const;

export default function ResumePage() {
  const router = useRouter();

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<ResumeData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      education: [
        {
          type: '',
          school: '',
          major: '',
          gpa: '',
          enrollmentDate: '',
          graduationDate: '',
          status: '',
        },
      ],
      certifications: [{ acquiredDate: '', name: '', issuer: '' }],
      awards: [{ date: '', name: '', issuer: '' }],
      careers: [{ company: '', startDate: '', endDate: '', type: '', position: '', duty: '' }],
    },
    mode: 'onChange',
  });

  const education = useFieldArray({ control, name: 'education' });
  const certifications = useFieldArray({ control, name: 'certifications' });
  const awards = useFieldArray({ control, name: 'awards' });
  const careers = useFieldArray({ control, name: 'careers' });

  const navigateNext = () => {
    if (nextStep) router.push(getOnboardingPath(nextStep));
  };

  const onSubmit = (data: ResumeData) => {
    // TODO: API 연동
    console.log(data);
    navigateNext();
  };

  const handleSkip = () => {
    navigateNext();
  };

  return (
    <div>
      <FormStepHeader totalSteps={TOTAL_STEPS} currentStep={stepNumber} title={stepTitle} />

      <div className="rounded-b-[20px] border border-[var(--border-light)] bg-[var(--bg-primary)] p-11">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-11">
          <div className="flex flex-col gap-[34px]">
            {/* ── 개인 정보 ── */}
            <div className="flex flex-col gap-6">
              <SectionTitle title="개인 정보" required />

              <div className="flex items-center gap-[34px]">
                {/* 증명사진 */}
                <label className="flex h-[186px] w-[140px] shrink-0 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-tertiary)] transition-colors hover:bg-[var(--primary-200)]">
                  <ImageIcon size={24} className="text-[var(--text-tertiary)]" />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-body2 text-[var(--text-tertiary)]">증명사진 업로드</span>
                    <span className="text-caption text-[var(--text-disabled)]">
                      JPG, PNG 2MB 이하
                    </span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" />
                </label>

                {/* 필드 그리드 */}
                <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2.5">
                  <div className="flex w-[388px] flex-col gap-2">
                    <Label className="text-[var(--text-secondary)]">이름</Label>
                    <Input
                      {...register('name')}
                      placeholder="본명을 입력해주세요."
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label className="text-[var(--text-secondary)]">이메일</Label>
                    <Input
                      {...register('email')}
                      placeholder="personal@gmail.com"
                      disabled
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="flex w-[388px] flex-col gap-2">
                    <Label className="text-[var(--text-secondary)]">전화번호</Label>
                    <Input
                      {...register('phone')}
                      placeholder="숫자만 입력해주세요."
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label className="text-[var(--text-secondary)]">주소</Label>
                    <Input
                      {...register('address')}
                      placeholder="살고주지를 입력해주세요."
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 학력 ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <SectionTitle title="학력" />
                <AddButton
                  label="학력 추가하기"
                  onClick={() =>
                    education.append({
                      type: '',
                      school: '',
                      major: '',
                      gpa: '',
                      enrollmentDate: '',
                      graduationDate: '',
                      status: '',
                    })
                  }
                />
              </div>

              {education.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative flex flex-col gap-2 rounded-[10px] bg-[var(--bg-tertiary)] p-6"
                >
                  {education.fields.length > 1 && (
                    <RemoveButton onClick={() => education.remove(index)} />
                  )}
                  <div className="flex gap-3.5">
                    <div className="flex w-[164px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">학력구분</Label>
                      <select {...register(`education.${index}.type`)} className={dropdownClass}>
                        <option value="">학력구분</option>
                        <option value="고등학교">고등학교</option>
                        <option value="대학교(2,3년)">대학교(2,3년)</option>
                        <option value="대학교(4년)">대학교(4년)</option>
                        <option value="대학원(석사)">대학원(석사)</option>
                        <option value="대학원(박사)">대학원(박사)</option>
                      </select>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">학교명</Label>
                      <Input
                        {...register(`education.${index}.school`)}
                        placeholder="학교명을 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">전공명</Label>
                      <Input
                        {...register(`education.${index}.major`)}
                        placeholder="전공명을 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3.5">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">학점</Label>
                      <Input
                        {...register(`education.${index}.gpa`)}
                        placeholder="평점/4.5"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">입학년월</Label>
                      <Input
                        {...register(`education.${index}.enrollmentDate`)}
                        placeholder="YYYY.MM"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">졸업년월</Label>
                      <Input
                        {...register(`education.${index}.graduationDate`)}
                        placeholder="YYYY.MM"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">졸업상태</Label>
                      <select {...register(`education.${index}.status`)} className={dropdownClass}>
                        <option value="">졸업상태</option>
                        <option value="재학중">재학중</option>
                        <option value="휴학중">휴학중</option>
                        <option value="졸업">졸업</option>
                        <option value="졸업예정">졸업예정</option>
                        <option value="중퇴">중퇴</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 자격증 ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <SectionTitle title="자격증" />
                <AddButton
                  label="자격증 추가하기"
                  onClick={() => certifications.append({ acquiredDate: '', name: '', issuer: '' })}
                />
              </div>

              {certifications.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative flex flex-col gap-2 rounded-[10px] bg-[var(--bg-tertiary)] p-6"
                >
                  {certifications.fields.length > 1 && (
                    <RemoveButton onClick={() => certifications.remove(index)} />
                  )}
                  <div className="flex gap-3.5">
                    <div className="flex w-[388px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">취득일</Label>
                      <Input
                        {...register(`certifications.${index}.acquiredDate`)}
                        placeholder="YYYY.MM.DD"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">자격증명</Label>
                      <Input
                        {...register(`certifications.${index}.name`)}
                        placeholder="자격증명을 정확하게 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex w-[388px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">발행처</Label>
                      <Input
                        {...register(`certifications.${index}.issuer`)}
                        placeholder="발행처를 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 수상이력 ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <SectionTitle title="수상이력" />
                <AddButton
                  label="수상이력 추가하기"
                  onClick={() => awards.append({ date: '', name: '', issuer: '' })}
                />
              </div>

              {awards.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative flex flex-col gap-2 rounded-[10px] bg-[var(--bg-tertiary)] p-6"
                >
                  {awards.fields.length > 1 && (
                    <RemoveButton onClick={() => awards.remove(index)} />
                  )}
                  <div className="flex gap-3.5">
                    <div className="flex w-[388px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">수상일</Label>
                      <Input
                        {...register(`awards.${index}.date`)}
                        placeholder="YYYY.MM.DD"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">수상명</Label>
                      <Input
                        {...register(`awards.${index}.name`)}
                        placeholder="수상명을 정확하게 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex w-[388px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">발행처</Label>
                      <Input
                        {...register(`awards.${index}.issuer`)}
                        placeholder="발행처를 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 경력사항 ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <SectionTitle title="경력사항" />
                <AddButton
                  label="학력 추가하기"
                  onClick={() =>
                    careers.append({
                      company: '',
                      startDate: '',
                      endDate: '',
                      type: '',
                      position: '',
                      duty: '',
                    })
                  }
                />
              </div>

              {careers.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative flex flex-col gap-2 rounded-[10px] bg-[var(--bg-tertiary)] p-6"
                >
                  {careers.fields.length > 1 && (
                    <RemoveButton onClick={() => careers.remove(index)} />
                  )}
                  <div className="flex gap-3.5">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">경력명</Label>
                      <Input
                        {...register(`careers.${index}.company`)}
                        placeholder="경력명을 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex w-[140px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">입사일</Label>
                      <Input
                        {...register(`careers.${index}.startDate`)}
                        placeholder="YYYY.MM.DD"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex w-[140px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">퇴사일</Label>
                      <Input
                        {...register(`careers.${index}.endDate`)}
                        placeholder="YYYY.MM.DD"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex w-[221px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">경력형태</Label>
                      <select {...register(`careers.${index}.type`)} className={dropdownClass}>
                        <option value="">경력형태</option>
                        <option value="정규직">정규직</option>
                        <option value="계약직">계약직</option>
                        <option value="인턴">인턴</option>
                        <option value="프리랜서">프리랜서</option>
                        <option value="아르바이트">아르바이트</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3.5">
                    <div className="flex w-[388px] flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">직급</Label>
                      <Input
                        {...register(`careers.${index}.position`)}
                        placeholder="직급을 입력해주세요."
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label className="text-[var(--text-secondary)]">담당업무</Label>
                      <Input
                        {...register(`careers.${index}.duty`)}
                        placeholder="담당업무를 한 줄정도로 적어주세요."
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 하단 버튼 ── */}
          <div className="flex items-center justify-end gap-3.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSkip}
              className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/5"
            >
              나중에 작성
            </Button>
            <Button
              type="submit"
              size="xs"
              disabled={!isValid}
              className={
                isValid
                  ? ''
                  : 'bg-[var(--primary-200)] text-[var(--text-tertiary)] hover:bg-[var(--primary-200)] disabled:opacity-100'
              }
            >
              다음
              <ArrowRight size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
