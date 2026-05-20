export const generatePassword = (length = 12) => {
  const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+[]{}<>?';

  const allChars = upperCase + lowerCase + numbers + specialChars;
  let password = '';

  // Ensure the password contains at least one of each character type
  password += upperCase[Math.floor(Math.random() * upperCase.length)];
  password += lowerCase[Math.floor(Math.random() * lowerCase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the remaining characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return password;
};
