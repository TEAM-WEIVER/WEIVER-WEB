'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

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
  saveApplicantInfo,
  saveAwards,
  saveCertificates,
  saveEducations,
  saveExperiences,
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

const EMPLOYMENT_TYPE_ENUM_TO_LABEL: Record<string, string> = {
  FULL_TIME: '정규직',
  CONTRACT: '계약직',
  INTERN: '인턴',
  FREELANCER: '프리랜서',
  PART_TIME: '아르바이트',
};

function mapEnum(value: string | null | undefined, table: Record<string, string>) {
  if (!value) return '';
  return table[value] ?? value;
}

function mapApplicantsToResumeForm(data: ApplicantsAllData): ResumeData {
  const applicant = data.ApplicantDTO;
  const educations = data.EducationDTO;
  const careers = data.WorkExperienceDTO;
  const certificates = data.CertificateDTO;
  const awards = data.AwardDTO;

  return {
    name: applicant?.name ?? '',
    email: applicant?.email ?? '',
    phone: applicant?.phoneNumber ?? '',
    birthday: applicant?.birthday ?? '',
    address: applicant?.address ?? '',
    education:
      educations.length > 0
        ? educations.map((e) => ({
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
            name: c.certificateName ?? '',
            acquiredDate: c.acquisitionDate ?? '',
            issuer: c.issuer ?? '',
          }))
        : [{ ...EMPTY_CERTIFICATION }],
    awards:
      awards.length > 0
        ? awards.map((a) => ({
            name: a.awardName ?? '',
            date: a.awardDate ?? '',
            issuer: a.issuer ?? '',
          }))
        : [{ ...EMPTY_AWARD }],
  };
}

export default function ResumePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isValid },
  } = useForm<ResumeData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      name: '',
      email: '',
      birthday: '',
      phone: '',
      address: '',
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
        reset(mapApplicantsToResumeForm(response.data));
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

      await saveApplicantInfo(formData);

      const subRequests: Promise<unknown>[] = [];

      const validEducations = data.education.filter((e) => !isEmptyEducation(e));
      if (validEducations.length > 0) {
        subRequests.push(
          saveEducations(
            validEducations.map((e) => ({
              degreeType: e.type,
              schoolName: e.school,
              major: e.major,
              gpa: e.gpa,
              startDate: e.enrollmentDate,
              endDate: e.graduationDate,
              status: e.status,
            })),
          ),
        );
      }

      const validCareers = data.careers.filter((c) => !isEmptyCareer(c));
      if (validCareers.length > 0) {
        subRequests.push(
          saveExperiences(
            validCareers.map((c) => ({
              companyName: c.company,
              startDate: c.startDate,
              endDate: c.endDate,
              employmentType: c.type,
              position: c.position,
              duties: c.duty,
            })),
          ),
        );
      }

      const validCertifications = data.certifications.filter((c) => !isEmptyCertification(c));
      if (validCertifications.length > 0) {
        subRequests.push(
          saveCertificates(
            validCertifications.map((c) => ({
              certificateName: c.name,
              acquisitionDate: c.acquiredDate,
              issuer: c.issuer,
            })),
          ),
        );
      }

      const validAwards = data.awards.filter((a) => !isEmptyAward(a));
      if (validAwards.length > 0) {
        subRequests.push(
          saveAwards(
            validAwards.map((a) => ({
              awardName: a.name,
              awardDate: a.date,
              issuer: a.issuer,
            })),
          ),
        );
      }

      const results = await Promise.allSettled(subRequests);
      const hasFailure = results.some((r) => r.status === 'rejected');

      if (hasFailure) {
        setSubmitError('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        return;
      }

      navigateNext();
    } catch {
      setSubmitError('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigateNext();
  };

  return (
    <OnboardingStepShell
      totalSteps={TOTAL_STEPS}
      currentStep={stepNumber}
      title={stepTitle}
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <div className="flex flex-col gap-3">
          {submitError && (
            <div role="alert" aria-live="assertive" className="bg-error/10 border-error text-error rounded-lg border px-4 py-3 text-sm">
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
              disabled={!isValid || isSubmitting}
              aria-busy={isSubmitting}
              aria-disabled={!isValid || isSubmitting}
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
      <PersonalInfoSection register={register} />
      <EducationSection
        fields={education.fields}
        register={register}
        append={education.append}
        remove={education.remove}
      />
      <CertificationSection
        fields={certifications.fields}
        register={register}
        append={certifications.append}
        remove={certifications.remove}
      />
      <AwardSection
        fields={awards.fields}
        register={register}
        append={awards.append}
        remove={awards.remove}
      />
      <CareerSection
        fields={careers.fields}
        register={register}
        append={careers.append}
        remove={careers.remove}
      />
    </OnboardingStepShell>
  );
}
