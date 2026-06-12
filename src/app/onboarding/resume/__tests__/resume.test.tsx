import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
} from '@/lib/onboarding-api';

import ResumePage from '../page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/onboarding-api', () => ({
  getApplicantsAll: vi.fn(),
  postAwards: vi.fn(),
  postCertificates: vi.fn(),
  postEducations: vi.fn(),
  postExperiences: vi.fn(),
  putAwards: vi.fn(),
  putCertificates: vi.fn(),
  putEducations: vi.fn(),
  putExperiences: vi.fn(),
  saveApplicantInfo: vi.fn(),
}));

describe('이력서 온보딩 페이지', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:profile-preview'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.mocked(saveApplicantInfo).mockResolvedValue({
      status: 'success',
      code: 200,
      data: null,
      message: null,
    });
    vi.mocked(postEducations).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(putEducations).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(postAwards).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(putAwards).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(postExperiences).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(putExperiences).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(postCertificates).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(putCertificates).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(getApplicantsAll).mockResolvedValue({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      },
      message: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('구직자 전체 정보 조회 결과를 개인 정보 입력 필드에 채운다', async () => {
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });
    expect(screen.getByPlaceholderText('2000-01-01')).toHaveValue('2001-07-30');
    expect(screen.getByPlaceholderText('010-1234-5678')).toHaveValue('010-8975-1978');
    expect(screen.getByPlaceholderText('weiver@example.com')).toHaveValue('rlawlsdl0730@gmail.com');
    expect(screen.getByPlaceholderText('경기도 안산시 상록구 한양대학로 55')).toHaveValue(
      '경기도 안산시 상록구 한양대학로 55',
    );
  });

  it('증명사진을 선택하면 미리보기를 표시하고 개인정보 저장 FormData에 파일을 담는다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });

    const imageFile = new File(['profile'], 'profile.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, imageFile);

    expect(screen.getByAltText('증명사진 미리보기')).toHaveAttribute('src', 'blob:profile-preview');

    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(saveApplicantInfo).toHaveBeenCalled();
    });
    const formData = vi.mocked(saveApplicantInfo).mock.calls[0][0];
    expect(formData.get('profileImage')).toBe(imageFile);
  });

  it('기존 경력이 없으면 다음 클릭 시 경력 최초 저장 POST를 보낸다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });
    await user.type(await screen.findByPlaceholderText('경력명을 입력해주세요.'), '쿠팡플레이');
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(postExperiences).toHaveBeenCalledWith([
        {
          companyName: '쿠팡플레이',
          startDate: '',
          endDate: '',
          employmentType: undefined,
          position: '',
          duties: '',
          isRecognized: true,
        },
      ]);
    });
    expect(putExperiences).not.toHaveBeenCalled();
  });

  it('기존 경력이 없고 경력을 여러 개 작성하면 POST 한 번에 배열로 보낸다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });

    await user.type(await screen.findByPlaceholderText('경력명을 입력해주세요.'), '쿠팡플레이');
    await user.click(screen.getByRole('button', { name: '경력 추가하기' }));
    await user.type(screen.getAllByPlaceholderText('경력명을 입력해주세요.')[1], '토스');
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(postExperiences).toHaveBeenCalledWith([
        {
          companyName: '쿠팡플레이',
          startDate: '',
          endDate: '',
          employmentType: undefined,
          position: '',
          duties: '',
          isRecognized: true,
        },
        {
          companyName: '토스',
          startDate: '',
          endDate: '',
          employmentType: undefined,
          position: '',
          duties: '',
          isRecognized: true,
        },
      ]);
    });
    expect(postExperiences).toHaveBeenCalledTimes(1);
    expect(putExperiences).not.toHaveBeenCalled();
  });

  it('기존 경력이 있으면 다음 클릭 시 id를 포함한 전체 경력 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [
          {
            experienceId: 1,
            companyName: '에이블리',
            position: '인턴',
            startDate: '2026-02-01',
            endDate: '2026-08-01',
            duties: 'B2B 서비스 백엔드 API 설계 및 개발',
            employmentType: 'INTERN',
            isRecognized: true,
          },
        ],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('경력명을 입력해주세요.')).toHaveValue('에이블리');
    });
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putExperiences).toHaveBeenCalledWith([
        {
          workExperienceId: 1,
          companyName: '에이블리',
          startDate: '2026-02-01',
          endDate: '2026-08-01',
          employmentType: 'INTERN',
          position: '인턴',
          duties: 'B2B 서비스 백엔드 API 설계 및 개발',
          isRecognized: true,
        },
      ]);
    });
    expect(postExperiences).not.toHaveBeenCalled();
  });

  it('기존 경력을 모두 삭제하면 빈 배열로 전체 덮어쓰기 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [
          {
            experienceId: 1,
            companyName: '에이블리',
            position: '인턴',
            startDate: '2026-02-01',
            endDate: '2026-08-01',
            duties: 'B2B 서비스 백엔드 API 설계 및 개발',
            employmentType: 'INTERN',
            isRecognized: true,
          },
        ],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('경력명을 입력해주세요.')).toHaveValue('에이블리');
    });
    await user.click(screen.getByRole('button', { name: '경력 삭제' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putExperiences).toHaveBeenCalledWith([]);
    });
    expect(postExperiences).not.toHaveBeenCalled();
  });

  it('기존 자격증이 없고 자격증을 여러 개 작성하면 POST 한 번에 배열로 보낸다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });

    await user.type(
      await screen.findByPlaceholderText('자격증명을 정확하게 입력해주세요.'),
      'SQLD',
    );
    await user.click(screen.getByRole('button', { name: '자격증 추가하기' }));
    await user.type(screen.getAllByPlaceholderText('자격증명을 정확하게 입력해주세요.')[1], 'ADsP');
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(postCertificates).toHaveBeenCalledWith([
        {
          certificateName: 'SQLD',
          acquisitionDate: '',
          issuer: '',
        },
        {
          certificateName: 'ADsP',
          acquisitionDate: '',
          issuer: '',
        },
      ]);
    });
    expect(postCertificates).toHaveBeenCalledTimes(1);
    expect(putCertificates).not.toHaveBeenCalled();
  });

  it('기존 자격증이 있으면 다음 클릭 시 id를 포함한 전체 자격증 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [
          {
            certificateId: 1,
            certificateName: 'SQLD',
            acquisitionDate: '2025-11-25',
            issuer: '한국데이터산업진흥원',
          },
        ],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('자격증명을 정확하게 입력해주세요.')).toHaveValue('SQLD');
    });
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putCertificates).toHaveBeenCalledWith([
        {
          certificateId: 1,
          certificateName: 'SQLD',
          acquisitionDate: '2025-11-25',
          issuer: '한국데이터산업진흥원',
        },
      ]);
    });
    expect(postCertificates).not.toHaveBeenCalled();
  });

  it('기존 자격증을 모두 삭제하면 빈 배열로 전체 덮어쓰기 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [
          {
            certificateId: 1,
            certificateName: 'SQLD',
            acquisitionDate: '2025-11-25',
            issuer: '한국데이터산업진흥원',
          },
        ],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('자격증명을 정확하게 입력해주세요.')).toHaveValue('SQLD');
    });
    await user.click(screen.getByRole('button', { name: '자격증 삭제' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putCertificates).toHaveBeenCalledWith([]);
    });
    expect(postCertificates).not.toHaveBeenCalled();
  });

  it('기존 학력이 없고 학력을 여러 개 작성하면 POST 한 번에 배열로 보낸다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });

    await user.selectOptions(screen.getByDisplayValue('학력구분'), '대학교(2,3년)');
    await user.type(await screen.findByPlaceholderText('학교명을 입력해주세요.'), '한양대학교');
    await user.click(screen.getByRole('button', { name: '학력 추가하기' }));
    await user.selectOptions(screen.getAllByDisplayValue('학력구분')[0], '대학교(4년)');
    await user.type(screen.getAllByPlaceholderText('학교명을 입력해주세요.')[1], '서울대학교');
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(postEducations).toHaveBeenCalledWith([
        {
          degreeType: 'ASSOCIATE',
          schoolName: '한양대학교',
          major: '',
          gpa: undefined,
          startDate: '',
          endDate: '',
          status: undefined,
        },
        {
          degreeType: 'BACHELOR',
          schoolName: '서울대학교',
          major: '',
          gpa: undefined,
          startDate: '',
          endDate: '',
          status: undefined,
        },
      ]);
    });
    expect(postEducations).toHaveBeenCalledTimes(1);
    expect(putEducations).not.toHaveBeenCalled();
  });

  it('기존 학력이 있으면 다음 클릭 시 id를 포함한 전체 학력 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [
          {
            educationId: 1,
            schoolName: '한양대학교',
            degree: 'ASSOCIATE',
            major: '컴퓨터학부',
            gpa: 4.1,
            startDate: '2021-03',
            endDate: '2027-03',
            status: 'ACTIVE',
          },
        ],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('학교명을 입력해주세요.')).toHaveValue('한양대학교');
    });
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putEducations).toHaveBeenCalledWith([
        {
          educationId: 1,
          degreeType: 'ASSOCIATE',
          schoolName: '한양대학교',
          major: '컴퓨터학부',
          gpa: 4.1,
          startDate: '2021-03',
          endDate: '2027-03',
          status: 'ACTIVE',
        },
      ]);
    });
    expect(postEducations).not.toHaveBeenCalled();
  });

  it('기존 학력을 모두 삭제하면 빈 배열로 전체 덮어쓰기 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [
          {
            educationId: 1,
            schoolName: '한양대학교',
            degree: 'ASSOCIATE',
            major: '컴퓨터학부',
            gpa: 4.1,
            startDate: '2021-03',
            endDate: '2027-03',
            status: 'ACTIVE',
          },
        ],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('학교명을 입력해주세요.')).toHaveValue('한양대학교');
    });
    await user.click(screen.getByRole('button', { name: '학력 삭제' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putEducations).toHaveBeenCalledWith([]);
    });
    expect(postEducations).not.toHaveBeenCalled();
  });

  it('기존 수상이력이 없고 수상이력을 여러 개 작성하면 POST 한 번에 배열로 보낸다', async () => {
    const user = userEvent.setup();
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('본명을 입력해주세요.')).toHaveValue('김민채');
    });

    await user.type(
      await screen.findByPlaceholderText('수상명을 정확하게 입력해주세요.'),
      '최우수상',
    );
    await user.click(screen.getByRole('button', { name: '수상이력 추가하기' }));
    await user.type(screen.getAllByPlaceholderText('수상명을 정확하게 입력해주세요.')[1], '우수상');
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(postAwards).toHaveBeenCalledWith([
        {
          awardName: '최우수상',
          awardDate: '',
          issuer: '',
        },
        {
          awardName: '우수상',
          awardDate: '',
          issuer: '',
        },
      ]);
    });
    expect(postAwards).toHaveBeenCalledTimes(1);
    expect(putAwards).not.toHaveBeenCalled();
  });

  it('기존 수상이력이 있으면 다음 클릭 시 id를 포함한 전체 수상이력 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [
          {
            awardId: 1,
            awardName: '소개딩 최우수상',
            awardDate: '2025-11-25',
            issuer: '한국인터넷진흥원',
          },
        ],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('수상명을 정확하게 입력해주세요.')).toHaveValue(
        '소개딩 최우수상',
      );
    });
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putAwards).toHaveBeenCalledWith([
        {
          awardId: 1,
          awardName: '소개딩 최우수상',
          awardDate: '2025-11-25',
          issuer: '한국인터넷진흥원',
        },
      ]);
    });
    expect(postAwards).not.toHaveBeenCalled();
  });

  it('기존 수상이력을 모두 삭제하면 빈 배열로 전체 덮어쓰기 PUT을 보낸다', async () => {
    const user = userEvent.setup();
    vi.mocked(getApplicantsAll).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        ApplicantDTO: {
          photoUrl: null,
          name: '김민채',
          birthday: '2001-07-30',
          phoneNumber: '010-8975-1978',
          email: 'rlawlsdl0730@gmail.com',
          address: '경기도 안산시 상록구 한양대학로 55',
        },
        EducationDTO: [],
        AwardDTO: [
          {
            awardId: 1,
            awardName: '소개딩 최우수상',
            awardDate: '2025-11-25',
            issuer: '한국인터넷진흥원',
          },
        ],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      },
      message: null,
    });
    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('수상명을 정확하게 입력해주세요.')).toHaveValue(
        '소개딩 최우수상',
      );
    });
    await user.click(screen.getByRole('button', { name: '수상이력 삭제' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(putAwards).toHaveBeenCalledWith([]);
    });
    expect(postAwards).not.toHaveBeenCalled();
  });
});
