import { v4 } from 'uuid';

export const generateTrxId = () => {
  const uuid = v4();
  const timestamp = Date.now();
  return `${uuid}-${timestamp}`;
};
