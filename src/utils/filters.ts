export function makeFullText<K extends string>(
  item: Partial<Record<K, string>> | any,
  updates: Partial<Record<K, string>> | any,
  ...keys: K[]
) {
  const joined = keys.map((k) => updates?.[k] || item[k] || '').join(' ');

  // remove apostrophes, and put 'x' in front of each word to get around Postgres stop words limitation
  return joined
    .toLowerCase()
    .replace("'", '') // remove apostrophes (e.g. let johns match john's)
    .replace(/[\W_]+/g, ' ') // change non-alphanumeric text to spaces (we only match words and numbers)
    .replace(/(\w+)/g, 'x$1') // put 'x' before every word to get around tsquery's annoying "stop words"
    .trim(); // strip any leading/trailing space
}

export function searchQuery(text: string) {
  if (!text) return '';

  const trimmed = text.toLowerCase().trim().replace("'", '');
  const phrases = trimmed
    .split('|')
    .map((phrase) => {
      const words = phrase
        .replace(/[\W_]+/g, ' ')
        .trim()
        .split(' ')
        .filter((w) => w.length > 1);

      // make a tsquery that matches every word (matching prefixes, not just whole words)
      // also accounting for the fact that the words in the fullText are prefixed with 'x'
      return words.map((w) => `x${w}:*`).join(' & ');
    })
    .filter(Boolean);
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return phrases[0];
  return `(${phrases.join(') | (')})`;
}
