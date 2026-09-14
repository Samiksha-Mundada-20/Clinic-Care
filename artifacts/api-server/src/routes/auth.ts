import { Router, type IRouter } from "express";
import { authenticateDemoAccount, clearDemoSession, getDemoSession, setDemoSession } from "../lib/demoAuth";

const router: IRouter = Router();

router.post("/auth/demo-login", (req, res): void => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const session = authenticateDemoAccount(email, password);
  if (!session) {
    res.status(401).json({ error: "Invalid demo account credentials" });
    return;
  }
  setDemoSession(res, session);
  res.json(session);
});

router.get("/auth/session", (req, res): void => {
  const session = getDemoSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.json(session);
});

router.post("/auth/logout", (_req, res): void => {
  clearDemoSession(res);
  res.json({ success: true });
});

export default router;