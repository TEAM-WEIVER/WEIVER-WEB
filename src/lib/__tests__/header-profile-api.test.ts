import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api-client';
import { getHeaderGivenName, getHeaderProfileName } from '../header-profile-api';

vi.mock('../api-client', () => ({ apiRequest: vi.fn() }));

describe('헤더 이름', () => {
  it.each([
    ['김민수', '민수'],
    ['남궁민수', '민수'],
    ['박준', '준'],
    [' 김민수 ', '민수'],
    [null, ''],
    ['', ''],
  ])('%s에서 표시 이름 %s를 추출한다', (name, expected) => {
    expect(getHeaderGivenName(name)).toBe(expected);
  });

  it('회원정보 API에서 이름을 가져온다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: { ApplicantDTO: { name: '김민수' } } });
    await expect(getHeaderProfileName()).resolves.toBe('민수');
    expect(apiRequest).toHaveBeenCalledWith('/api/applicants');
  });

  it('프로필이 없으면 빈 이름으로 반환한다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: { ApplicantDTO: null } });
    await expect(getHeaderProfileName()).resolves.toBe('');
  });
});
