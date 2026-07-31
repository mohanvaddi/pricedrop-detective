import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import config from '../config';
import { authMiddleware, type AuthRequest } from '../src/api/middleware/auth';

const SECRET = config.JWT_SECRET;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('authMiddleware', () => {
  it('calls next and sets userId for a valid Bearer token', () => {
    const token = jwt.sign({ sub: 'user-42' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-42');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('401s when the Authorization header is missing', () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when the header is not a Bearer token', () => {
    const req = { headers: { authorization: 'Basic abc' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s for a token signed with the wrong secret', () => {
    const token = jwt.sign({ sub: 'user-42' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s for an expired token', () => {
    const token = jwt.sign({ sub: 'user-42' }, SECRET, { expiresIn: -10 });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
