import crypto from 'crypto';

export const generateRandomSalt = (saltLength: number): string => {
  const salt = crypto
    .randomBytes(Math.ceil(saltLength / 2))
    .toString('hex')
    .slice(0, saltLength);
  return salt;
};

export const caluculateHash = (text: string) => {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
};
