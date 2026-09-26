import { http, HttpResponse } from 'msw';

export const inquiryHandlers = [
  http.post('https://api.piuda.site/api/inquiries', () => {
    return HttpResponse.json({ status: 'OK', code: 200, data: null, message: 'OK' });
  }),
];
