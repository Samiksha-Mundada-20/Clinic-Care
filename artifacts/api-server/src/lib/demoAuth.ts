import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export type DemoRole = "patient" | "receptionist";

export type DemoSession = {
  role: DemoRole;
  name: string;
  patientId?: number;
};

const COOKIE_NAME = "clinic_session";
const secret = () => process.env.SESSION_SECRET ?? "clinic-demo-session-secret";

const accounts = [
  { email: "patient@horizonclinic.demo", password: "patient123", role: "patient" as const, name: "Ananya Iyer", patientId: 1 },
  { email: "reception@horizonclinic.demo", password: "reception123", role: "receptionist" as const, name: "Priya Nair" },
];

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function serialize(session: DemoSession) {
  const payload = encode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function deserialize(value?: string): DemoSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DemoSession;
    return parsed.role === "patient" || parsed.role === "receptionist" ? parsed : null;
  } catch {
    return null;
  }
}

export function authenticateDemoAccount(email: string, password: string): DemoSession | null {
  const account = accounts.find((candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password);
  if (!account) return null;
  return { role: account.role, name: account.name, ...(account.patientId ? { patientId: account.patientId } : {}) };
}

export function getDemoSession(req: Request): DemoSession | null {
  const header = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return deserialize(header?.slice(COOKIE_NAME.length + 1));
}

export function setDemoSession(res: Response, session: DemoSession) {
  res.cookie(COOKIE_NAME, serialize(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12,
    path: "/",
  });
}

export function clearDemoSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}

export function hasRole(req: Request, role: DemoRole) {
  return getDemoSession(req)?.role === role;
}
