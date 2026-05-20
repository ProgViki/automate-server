export const generateLicenseKey = (): string => {

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';

  for (let i = 0; i < 25; i++) {
    if (i > 0 && i % 5 === 0) {
      key += '-';
    }
    const randomIndex = Math.floor(Math.random() * chars.length);
    key += chars[randomIndex];
  }

  return key;
};
