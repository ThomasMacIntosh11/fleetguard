// lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export async function signSession(payload: Record<string, unknown>, days = 30) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * days;
  return new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}