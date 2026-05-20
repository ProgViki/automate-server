import { Transform } from 'class-transformer';

export function ToLowerCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  });
}

export function ToNumber() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      const num = Number(normalized);
      return isNaN(num) ? value : num;
    }
    return value;
  });
}
