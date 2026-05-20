import { v4 } from 'uuid';

export const generateUniqueId = () => {
  const uuid = v4();
  const timestamp = Date.now();
  const reference = `${uuid}-${timestamp}`;
  return reference;
};

export const generateCode = (length = 8) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let referralCode = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralCode += characters[randomIndex];
  }
  return referralCode;
};
