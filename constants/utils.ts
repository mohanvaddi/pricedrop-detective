import crypto from 'crypto';

export const generateRandomSalt = (saltLength: number): string => {
  return crypto
    .randomBytes(Math.ceil(saltLength / 2))
    .toString('hex')
    .slice(0, saltLength);
};

export const caluculateHash = (text: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex').slice(0, 8);
};

export const readableDateTime = (date: string): string => {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
