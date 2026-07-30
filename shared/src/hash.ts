import crypto from 'crypto';

export const caluculateHash = (text: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex').slice(0, 8);
};
