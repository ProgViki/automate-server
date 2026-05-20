import { v4 } from 'uuid';

export const generateTrxRef = () => {
  const uuid = v4();
  const timestamp = Date.now();
  const reference = `${uuid}-${timestamp}`;
  return reference;
};
