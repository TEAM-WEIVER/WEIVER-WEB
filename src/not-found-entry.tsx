import { createRoot } from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable.css';

import NotFound from '@/pages/not-found';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(<NotFound />);
