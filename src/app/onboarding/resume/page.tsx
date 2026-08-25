'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getNextOnboardingStep,
  getOnboardingPath,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
} from '@/lib/onboarding-flow';
import {
  getApplicantsAll,
  postAwards,
  postCertificates,
  postEducations,
  postExperiences,
  putAwards,
  putCertificates,
  putEducations,
  putExperiences,
  saveApplicantInfo,
  type ApplicantsAllData,
} from '@/lib/onboarding-api';
import { resumeSchema, type ResumeData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { AwardSection, EMPTY_AWARD } from './_components/award-section';
import { CareerSection, EMPTY_CAREER } from './_components/career-section';
import { CertificationSection, EMPTY_CERTIFICATION } from './_components/certification-section';
import { EducationSection, EMPTY_EDUCATION } from './_components/education-section';
import { PersonalInfoSection } from './_components/personal-info-section';

const CURRENT_STEP = 'resume' as const;

function isEmptyEducation(edu: ResumeData['education'][number]) {
  return !edu.school && !edu.type;
}

function isEmptyCareer(career: ResumeData['careers'][number]) {
  return !career.company;
}

function isEmptyCertification(cert: ResumeData['certifications'][number]) {
  return !cert.name;
}

function isEmptyAward(award: ResumeData['awards'][number]) {
  return !award.name;
}

const DEGREE_ENUM_TO_LABEL: Record<string, string> = {
  HIGH_SCHOOL: '고등학교',
  ASSOCIATE: '대학교(2,3년)',
  BACHELOR: '대학교(4년)',
  MASTER: '대학원(석사)',
  DOCTOR: '대학원(박사)',
};

const EDUCATION_STATUS_ENUM_TO_LABEL: Record<string, string> = {
  ACTIVE: '재학중',
  LEAVE_OF_ABSENCE: '휴학중',
  GRADUATED: '졸업',
  GRADUATION_POSTPONED: '졸업예정',
};
const DEGREE_LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(DEGREE_ENUM_TO_LABEL).map(([value, label]) => [label, value]),
);
const EDUCATION_STATUS_LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(EDUCATION_STATUS_ENUM_TO_LABEL).map(([value, label]) => [label, value]),
);

const EMPLOYMENT_TYPE_ENUM_TO_LABEL: Record<string, string> = {
  FULL_TIME: '정규직',
  CONTRACT: '계약직',
  INTERN: '인턴',
  FREELANCER: '프리랜서',
  MILITARY_SERVICE_EXEMPTION: '병역특례',
  PART_TIME: '아르바이트',
};
const EMPLOYMENT_TYPE_LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(EMPLOYMENT_TYPE_ENUM_TO_LABEL).map(([value, label]) => [label, value]),
);

function mapEnum(value: string | null | undefined, table: Record<string, string>) {
  if (!value) return '';
  return table[value] ?? value;
}

function mapApplicantsToResumeForm(data: ApplicantsAllData): ResumeData {
  const applicant = data.ApplicantDTO;
  const educations = data.EducationDTO ?? [];
  const careers = data.WorkExperienceDTO ?? [];
  const certificates = data.CertificateDTO ?? [];
  const awards = data.AwardDTO ?? [];

  return {
    name: applicant?.name ?? '',
    email: applicant?.email ?? '',
    phone: applicant?.phoneNumber ?? '',
    birthday: applicant?.birthday ?? '',
    address: applicant?.address ?? '',
    profileImage: undefined,
    education:
      educations.length > 0
        ? educations.map((e) => ({
            educationId: e.educationId,
            type: mapEnum(e.degree, DEGREE_ENUM_TO_LABEL),
            school: e.schoolName ?? '',
            major: e.major ?? '',
            gpa: e.gpa != null ? String(e.gpa) : '',
            enrollmentDate: e.startDate ?? '',
            graduationDate: e.endDate ?? '',
            status: mapEnum(e.status, EDUCATION_STATUS_ENUM_TO_LABEL),
          }))
        : [{ ...EMPTY_EDUCATION }],
    careers:
      careers.length > 0
        ? careers.map((c) => ({
            workExperienceId: c.experienceId,
            isRecognized: c.isRecognized ?? true,
            company: c.companyName ?? '',
            startDate: c.startDate ?? '',
            endDate: c.endDate ?? '',
            type: mapEnum(c.employmentType, EMPLOYMENT_TYPE_ENUM_TO_LABEL),
            position: c.position ?? '',
            duty: c.duties ?? '',
          }))
        : [{ ...EMPTY_CAREER }],
    certifications:
      certificates.length > 0
        ? certificates.map((c) => ({
            certificateId: c.certificateId,
            name: c.certificateName ?? '',
            acquiredDate: c.acquisitionDate ?? '',
            issuer: c.issuer ?? '',
          }))
        : [{ ...EMPTY_CERTIFICATION }],
    awards:
      awards.length > 0
        ? awards.map((a) => ({
            awardId: a.awardId,
            name: a.awardName ?? '',
            date: a.awardDate ?? '',
            issuer: a.issuer ?? '',
          }))
        : [{ ...EMPTY_AWARD }],
  };
}

function getResumeValidationMessage(errors: FieldErrors<ResumeData>) {
  return Object.keys(errors).length > 0
    ? '입력하지 않았거나 올바르지 않은 필드를 확인해주세요.'
    : '오류가 발생했습니다. 다시 시도해주세요.';
}

export default function ResumePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasSavedAwardsRef = useRef(false);
  const hasSavedCertificatesRef = useRef(false);
  const hasSavedEducationsRef = useRef(false);
  const hasSavedExperiencesRef = useRef(false);

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, submitCount },
  } = useForm<ResumeData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      name: '',
      email: '',
      birthday: '',
      phone: '',
      address: '',
      profileImage: undefined,
      education: [{ ...EMPTY_EDUCATION }],
      certifications: [{ ...EMPTY_CERTIFICATION }],
      awards: [{ ...EMPTY_AWARD }],
      careers: [{ ...EMPTY_CAREER }],
    },
    mode: 'onChange',
  });

  const education = useFieldArray({ control, name: 'education' });
  const certifications = useFieldArray({ control, name: 'certifications' });
  const awards = useFieldArray({ control, name: 'awards' });
  const careers = useFieldArray({ control, name: 'careers' });

  useEffect(() => {
    let cancelled = false;

    async function loadApplicant() {
      try {
        const response = await getApplicantsAll();
        if (cancelled) return;
        hasSavedAwardsRef.current = (response.data.AwardDTO ?? []).length > 0;
        hasSavedCertificatesRef.current = (response.data.CertificateDTO ?? []).length > 0;
        hasSavedEducationsRef.current = (response.data.EducationDTO ?? []).length > 0;
        hasSavedExperiencesRef.current = (response.data.WorkExperienceDTO ?? []).length > 0;
        setPhotoUrl(response.data.ApplicantDTO?.photoUrl ?? null);
        const resumeForm = mapApplicantsToResumeForm(response.data);
        reset(resumeForm);
      } catch (err) {
        console.error('[resume] getApplicantsAll 실패:', err);
      }
    }

    loadApplicant();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const navigateNext = () => {
    if (nextStep) router.push(getOnboardingPath(nextStep));
  };

  const onSubmit = async (data: ResumeData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      const requestDTO = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phone,
        address: data.address,
        birthday: data.birthday ?? '',
      };
      formData.append(
        'requestDTO',
        new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }),
      );
      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      await saveApplicantInfo(formData);

      const subRequests: Promise<unknown>[] = [];

      const validEducations = data.education.filter((e) => !isEmptyEducation(e));
      const educationPayload = validEducations.map((e) => ({
        educationId: e.educationId,
        degreeType: e.type ? (DEGREE_LABEL_TO_ENUM[e.type] ?? e.type) : '',
        schoolName: e.school,
        major: e.major,
        gpa: e.gpa ? Number(e.gpa) : undefined,
        startDate: e.enrollmentDate,
        endDate: e.graduationDate,
        status: e.status ? (EDUCATION_STATUS_LABEL_TO_ENUM[e.status] ?? e.status) : undefined,
      }));
      // 빈 배열 PUT = 전체 삭제 의도 (사용자가 항목을 모두 제거한 경우)
      if (hasSavedEducationsRef.current) {
        subRequests.push(putEducations(educationPayload));
      } else if (educationPayload.length > 0) {
        subRequests.push(
          postEducations(educationPayload.map(({ educationId: _id, ...rest }) => rest)),
        );
      }

      const validCareers = data.careers.filter((c) => !isEmptyCareer(c));
      const careerPayload = validCareers.map((c) => ({
        workExperienceId: c.workExperienceId,
        companyName: c.company,
        startDate: c.startDate,
        endDate: c.endDate,
        employmentType: c.type ? (EMPLOYMENT_TYPE_LABEL_TO_ENUM[c.type] ?? c.type) : undefined,
        position: c.position,
        duties: c.duty,
        isRecognized: c.isRecognized ?? true,
      }));
      if (hasSavedExperiencesRef.current) {
        subRequests.push(putExperiences(careerPayload));
      } else if (careerPayload.length > 0) {
        subRequests.push(
          postExperiences(careerPayload.map(({ workExperienceId: _id, ...rest }) => rest)),
        );
      }

      const validCertifications = data.certifications.filter((c) => !isEmptyCertification(c));
      const certificatePayload = validCertifications.map((c) => ({
        certificateId: c.certificateId,
        certificateName: c.name,
        acquisitionDate: c.acquiredDate,
        issuer: c.issuer,
      }));
      if (hasSavedCertificatesRef.current) {
        subRequests.push(putCertificates(certificatePayload));
      } else if (certificatePayload.length > 0) {
        subRequests.push(
          postCertificates(certificatePayload.map(({ certificateId: _id, ...rest }) => rest)),
        );
      }

      const validAwards = data.awards.filter((a) => !isEmptyAward(a));
      const awardPayload = validAwards.map((a) => ({
        awardId: a.awardId,
        awardName: a.name,
        awardDate: a.date,
        issuer: a.issuer,
      }));
      if (hasSavedAwardsRef.current) {
        subRequests.push(putAwards(awardPayload));
      } else if (awardPayload.length > 0) {
        subRequests.push(postAwards(awardPayload.map(({ awardId: _id, ...rest }) => rest)));
      }

      const results = await Promise.allSettled(subRequests);
      const hasFailure = results.some((r) => r.status === 'rejected');

      if (hasFailure) {
        try {
          const fresh = await getApplicantsAll();
          hasSavedAwardsRef.current = (fresh.data.AwardDTO ?? []).length > 0;
          hasSavedCertificatesRef.current = (fresh.data.CertificateDTO ?? []).length > 0;
          hasSavedEducationsRef.current = (fresh.data.EducationDTO ?? []).length > 0;
          hasSavedExperiencesRef.current = (fresh.data.WorkExperienceDTO ?? []).length > 0;
          reset(mapApplicantsToResumeForm(fresh.data));
        } catch {
          // 재조회 실패 시 ref가 미갱신 상태이므로 재시도 대신 새로고침을 유도한다
          setSubmitError('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
          return;
        }
        setSubmitError('오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      navigateNext();
    } catch {
      setSubmitError('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (validationErrors: FieldErrors<ResumeData>) => {
    setSubmitError(getResumeValidationMessage(validationErrors));
  };

  const handleSkip = () => {
    navigateNext();
  };

  return (
    <OnboardingStepShell
      totalSteps={TOTAL_STEPS}
      currentStep={stepNumber}
      title={stepTitle}
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      footer={
        <div className="flex flex-col gap-3">
          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-error/10 border-error text-error rounded-lg border px-4 py-3 text-sm whitespace-pre-line"
            >
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="border-error text-error hover:bg-error/5"
            >
              나중에 작성
            </Button>
            <Button
              type="submit"
              size="xs"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              aria-disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  저장 중
                </>
              ) : (
                <>
                  다음
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <PersonalInfoSection
        control={control}
        errors={errors}
        photoUrl={photoUrl}
        setValue={setValue}
        showErrors={submitCount > 0}
      />
      <EducationSection
        fields={education.fields}
        control={control}
        errors={errors}
        register={register}
        append={education.append}
        remove={education.remove}
        showErrors={submitCount > 0}
      />
      <CertificationSection
        fields={certifications.fields}
        control={control}
        errors={errors}
        register={register}
        append={certifications.append}
        remove={certifications.remove}
        showErrors={submitCount > 0}
      />
      <AwardSection
        fields={awards.fields}
        control={control}
        errors={errors}
        register={register}
        append={awards.append}
        remove={awards.remove}
        showErrors={submitCount > 0}
      />
      <CareerSection
        fields={careers.fields}
        control={control}
        errors={errors}
        register={register}
        append={careers.append}
        remove={careers.remove}
        showErrors={submitCount > 0}
      />
    </OnboardingStepShell>
  );
}
