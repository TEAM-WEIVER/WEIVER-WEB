import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import { createInquiry } from '../inquiry-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('createInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('제목과 내용을 문의 API로 전송한다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: null,
      message: 'OK',
    });

    await createInquiry({ title: '면접 일정 문의', content: '면접 일정을 변경하고 싶습니다.' });

    expect(apiRequest).toHaveBeenCalledWith('/api/inquiries', {
      method: 'POST',
      body: { title: '면접 일정 문의', content: '면접 일정을 변경하고 싶습니다.' },
    });
  });
});
