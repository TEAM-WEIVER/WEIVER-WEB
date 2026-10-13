import { http, HttpResponse } from 'msw';

export const inquiryHandlers = [
  http.post('https://api.weiverai.com/api/inquiries', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
];
