import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createWebUser, findWebUserByEmail } from '../../db/users';
import { CustomError } from '../../../constants/error';
import config from '../../../config';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, display_name } = req.body as { email?: string; password?: string; display_name?: string };
  if (!email || !password || password.length < 8) {
    res.status(400).json({ error: 'Valid email and password (min 8 chars) are required.' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await createWebUser(email.toLowerCase().trim(), passwordHash, display_name);
    const token = jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(409).json({ error: 'Email already registered.' });
    } else {
      console.error('[api/auth] register error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await findWebUserByEmail(email.toLowerCase().trim());
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const token = jwt.sign({ sub: user.userId }, config.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('[api/auth] login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
