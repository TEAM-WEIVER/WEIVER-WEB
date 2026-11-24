import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInquiry } from '@/lib/inquiry-api';

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(100, '100자 이내로 입력해주세요.'),
  content: z
    .string()
    .trim()
    .min(1, '문의 내용을 입력해주세요.')
    .max(5000, '5,000자 이내로 입력해주세요.'),
});

export default function SupportPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '' },
  });
  const submit = handleSubmit(async (values) => {
    setSent(false);
    try {
      await createInquiry(values);
      reset();
      setSent(true);
    } catch {
      setError('root', {
        message: '문의를 접수하지 못했어요. 입력한 내용을 유지한 채 다시 시도해주세요.',
      });
    }
  });
  return (
    <>
      <Link to="/home" className="text-body2 text-text-tertiary underline underline-offset-4">
        홈으로 돌아가기
      </Link>
      <h1 className="text-h2 mt-6 mb-3">고객지원</h1>
      <p className="text-body1 text-text-secondary mb-8">
        서비스 이용 중 불편한 점이나 궁금한 내용을 보내주세요.
      </p>
      <section className="border-border-light rounded-xl border bg-white p-6">
        <h2 className="text-h3 mb-6">문의하기</h2>
        <form onSubmit={submit} noValidate className="space-y-6">
          <fieldset disabled={isSubmitting} className="space-y-6">
            <FormField label="문의 제목" error={errors.title?.message}>
              {(field) => <Input {...register('title')} {...field} maxLength={100} />}
            </FormField>
            <FormField label="문의 내용" error={errors.content?.message}>
              {(field) => (
                <Textarea
                  {...register('content')}
                  {...field}
                  maxLength={5000}
                  className="min-h-48"
                />
              )}
            </FormField>
          </fieldset>
          {errors.root ? (
            <p role="alert" className="text-body2 text-error">
              {errors.root.message}
            </p>
          ) : null}
          {sent ? (
            <p role="status" className="text-body2 text-text-secondary">
              문의가 접수되었어요.
            </p>
          ) : null}
          <Button type="submit" isLoading={isSubmitting}>
            문의 접수
          </Button>
        </form>
      </section>
    </>
  );
}
