export const jsonpToJson = (jsonpData: string) => {
  // Match the content inside the function call
  const match = jsonpData.match(/^[^(]+\(([\s\S]*)\);?$/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (err) {
      console.error('Failed to parse JSON:', err);
    }
  }
  throw new Error('Invalid JSONP response');
};
