import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export default <T>(attr: 'body' | 'params' | 'query', schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const input = schema.safeParse(req[attr]);
    if (!input.success) {
      return res.status(400).send({ error: `Invalid ${attr} schema`, data: input.error.issues });
    }

    res.locals[attr] = input.data;
    next();
  };
