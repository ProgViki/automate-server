import { randomInt } from 'crypto';

export const generateSecureDigits = (num: number) => {
  const randInt = randomInt(1000, 9999);
  return randInt.toString().padStart(num, '0');
};
