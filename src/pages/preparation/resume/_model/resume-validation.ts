import { z } from 'zod';

import type { ResumeField, ResumeValues } from './resume-types';

export function isFieldDisabled<Name extends string>(
  field: ResumeField<Name>,
  values: ResumeValues<Name>,
) {
  return (
    field.disabledWhen !== undefined && values[field.disabledWhen.name] === field.disabledWhen.value
  );
}

export function clearDisabledFields<Name extends string>(
  fields: readonly ResumeField<Name>[],
  values: ResumeValues<Name>,
) {
  const nextValues = { ...values };
  for (const field of fields) {
    if (isFieldDisabled(field, values)) Object.assign(nextValues, { [field.name]: '' });
  }
  return nextValues;
}

const isoDate = z.iso.date();
const monthPattern = /^[1-9]\d{3}\.(0[1-9]|1[0-2])$/;
const decimalPattern = /^\d+(\.\d+)?$/;

export function validateEntry<Name extends string>(
  fields: readonly ResumeField<Name>[],
  values: ResumeValues<Name>,
) {
  const errors: Partial<Record<Name, string>> = {};

  for (const field of fields) {
    if (isFieldDisabled(field, values)) continue;

    const value = values[field.name].trim();
    if (!value) {
      if (field.required)
        errors[field.name] = field.options ? '항목을 선택해주세요.' : '필수 입력 항목입니다.';
    } else if (
      (field.format === 'month' && !monthPattern.test(value)) ||
      (field.format === 'date' && !isoDate.safeParse(value.replaceAll('.', '-')).success)
    ) {
      errors[field.name] = `${field.placeholder} 형식의 날짜를 입력해주세요.`;
    } else if (field.format === 'decimal' && !decimalPattern.test(value)) {
      errors[field.name] = '숫자를 입력해주세요.';
    } else if (field.options && !field.options.includes(value)) {
      errors[field.name] = '목록에서 항목을 선택해주세요.';
    }
  }

  return errors;
}
