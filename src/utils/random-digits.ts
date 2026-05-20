export function getRandomNDigits(n) {
  const min = 10 ** (n - 1);
  const max = 10 ** n - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
}
