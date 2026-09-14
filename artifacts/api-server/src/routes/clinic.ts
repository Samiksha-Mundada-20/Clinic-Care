import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { db, appointmentsTable, doctorsTable, patientsTable, queueItemsTable, visitsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  CreateAppointmentResponse,
  CreatePatientVisitBody,
  CreatePatientVisitParams,
  CreatePatientVisitResponse,
  Dashboard,
  GenerateTokenBody,
  GenerateTokenResponse,
  GetDashboardQueryParams,
  GetDashboardResponse,
  GetPatientParams,
  GetPatientResponse,
  ListAppointmentsQueryParams,
  ListAppointmentsResponse,
  ListDoctorsResponse,
  ListPatientVisitsResponse,
  ListQueueQueryParams,
  ListQueueResponse,
  Patient,
  QueueItem,
  UpdateDoctorDelayBody,
  UpdateDoctorDelayParams,
  UpdateDoctorDelayResponse,
  UpdatePatientBody,
  UpdatePatientParams,
  UpdatePatientResponse,
  UpdateQueueStatusBody,
  UpdateQueueStatusParams,
  UpdateQueueStatusResponse,
} from "@workspace/api-zod";
import { getDemoSession, type DemoSession } from "../lib/demoAuth";

const router: IRouter = Router();
const defaultPatientId = 1;
let seedPromise: Promise<void> | null = null;

function currentSession(req: Request): DemoSession | null {
  return getDemoSession(req);
}

function requireRole(req: Request, res: Response, roles: DemoSession["role"][]) {
  const current = currentSession(req);
  if (!current) {
    res.status(401).json({ error: "Sign in to use the clinic portal" });
    return null;
  }
  if (!roles.includes(current.role)) {
    res.status(403).json({ error: "This account does not have access to this action" });
    return null;
  }
  return current;
}

router.use((req, res, next) => {
  if (!currentSession(req)) {
    res.status(401).json({ error: "Sign in to use the clinic portal" });
    return;
  }
  next();
});

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function dateString(value: Date | string): string {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

async function seedClinic(): Promise<void> {
  const existingDoctors = await db.select({ id: doctorsTable.id }).from(doctorsTable).limit(1);
  if (existingDoctors.length > 0) return;

  const [doctorOne, doctorTwo] = await db.insert(doctorsTable).values([
    { name: "Dr. Maya Sharma", specialty: "General medicine", room: "Room 204", status: "delayed", delayMinutes: 18, currentToken: 24, avgVisitMinutes: 15 },
    { name: "Dr. Arjun Mehta", specialty: "Dermatology", room: "Room 108", status: "on_time", delayMinutes: 0, currentToken: 11, avgVisitMinutes: 12 },
  ]).returning();
  const [patient] = await db.insert(patientsTable).values({
    name: "Ananya Iyer",
    email: "ananya.iyer@example.com",
    phone: "+91 98765 43210",
    dateOfBirth: "1995-06-18",
    bloodGroup: "O+",
  }).returning();
  await db.insert(appointmentsTable).values([
    { patientId: patient.id, doctorId: doctorOne.id, date: today(), time: "10:30 AM", reason: "Follow-up consultation", status: "checked_in", tokenNumber: 27 },
    { patientId: patient.id, doctorId: doctorTwo.id, date: today(), time: "04:15 PM", reason: "Skin consultation", status: "booked" },
  ]);
  await db.insert(queueItemsTable).values([
    { tokenNumber: 25, patientId: patient.id, doctorId: doctorOne.id, appointmentTime: "09:45 AM", date: today(), status: "completed", source: "online" },
    { tokenNumber: 26, patientId: patient.id, doctorId: doctorOne.id, appointmentTime: "10:05 AM", date: today(), status: "in_room", source: "online" },
    { tokenNumber: 27, patientId: patient.id, doctorId: doctorOne.id, appointmentTime: "10:30 AM", date: today(), status: "waiting", source: "online" },
    { tokenNumber: 28, patientId: patient.id, doctorId: doctorOne.id, appointmentTime: "10:45 AM", date: today(), status: "waiting", source: "walk_in" },
    { tokenNumber: 29, patientId: patient.id, doctorId: doctorOne.id, appointmentTime: "11:00 AM", date: today(), status: "waiting", source: "online" },
  ]);
  await db.insert(visitsTable).values({
    patientId: patient.id,
    doctorId: doctorOne.id,
    date: "2026-08-26",
    diagnosis: "Seasonal allergic rhinitis",
    notes: "Continue hydration and avoid known triggers. Review in four weeks if symptoms persist.",
    prescriptions: [
      { name: "Cetirizine", dosage: "10 mg", frequency: "Once at night", duration: "10 days" },
      { name: "Saline nasal spray", dosage: "2 sprays", frequency: "Twice daily", duration: "As needed" },
    ],
  });
}

async function ensureSeed(): Promise<void> {
  if (!seedPromise) seedPromise = seedClinic();
  await seedPromise;
}

async function doctorById(id: number) {
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id));
  return doctor;
}

async function doctorResponse(doctor: typeof doctorsTable.$inferSelect) {
  const waiting = await db.select({ id: queueItemsTable.id })
    .from(queueItemsTable)
    .where(and(eq(queueItemsTable.doctorId, doctor.id), eq(queueItemsTable.date, today()), eq(queueItemsTable.status, "waiting")));
  return { ...doctor, waitingCount: waiting.length };
}

async function appointmentResponse(appointment: typeof appointmentsTable.$inferSelect) {
  return appointment;
}

router.get("/doctors", async (_req, res): Promise<void> => {
  await ensureSeed();
  const doctors = await db.select().from(doctorsTable).orderBy(asc(doctorsTable.id));
  const response = await Promise.all(doctors.map(doctorResponse));
  res.json(ListDoctorsResponse.parse(response));
});

router.patch("/doctors/:doctorId/delay", async (req, res): Promise<void> => {
  if (!requireRole(req, res, ["receptionist"])) return;
  await ensureSeed();
  const params = UpdateDoctorDelayParams.safeParse(req.params);
  const body = UpdateDoctorDelayBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid doctor delay" });
    return;
  }
  const [doctor] = await db.update(doctorsTable)
    .set({ delayMinutes: body.data.delayMinutes, status: body.data.delayMinutes > 0 ? "delayed" : "on_time" })
    .where(eq(doctorsTable.id, params.data.doctorId))
    .returning();
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(UpdateDoctorDelayResponse.parse(doctor));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  await ensureSeed();
  const query = GetDashboardQueryParams.safeParse({
    ...req.query,
    date: req.query.date ? new Date(String(req.query.date)) : undefined,
  });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const date = query.data.date ? dateString(query.data.date) : today();
  const appointmentConditions = [eq(appointmentsTable.date, date)];
  if (query.data.doctorId) appointmentConditions.push(eq(appointmentsTable.doctorId, query.data.doctorId));
  const appointments = await db.select().from(appointmentsTable).where(and(...appointmentConditions)).orderBy(asc(appointmentsTable.time));
  const queueConditions = [eq(queueItemsTable.date, date), eq(queueItemsTable.status, "waiting")];
  if (query.data.doctorId) queueConditions.push(eq(queueItemsTable.doctorId, query.data.doctorId));
  const waiting = await db.select().from(queueItemsTable).where(and(...queueConditions));
  const doctors = await db.select().from(doctorsTable);
  const delayedDoctors = await Promise.all(doctors.filter((doctor) => doctor.delayMinutes > 0).map(doctorResponse));
  const nextAppointment = appointments.find((appointment) => appointment.status === "booked") ?? null;
  const dashboard = {
    date,
    totalAppointments: appointments.length,
    checkedIn: appointments.filter((appointment) => appointment.status === "checked_in").length,
    waitingCount: waiting.length,
    currentToken: query.data.doctorId ? (doctors.find((doctor) => doctor.id === query.data.doctorId)?.currentToken ?? 0) : Math.max(...doctors.map((doctor) => doctor.currentToken), 0),
    avgVisitMinutes: query.data.doctorId ? (doctors.find((doctor) => doctor.id === query.data.doctorId)?.avgVisitMinutes ?? 15) : Math.round(doctors.reduce((sum, doctor) => sum + doctor.avgVisitMinutes, 0) / Math.max(doctors.length, 1)),
    delayedDoctors,
    nextAppointment,
  };
  res.json(GetDashboardResponse.parse(dashboard));
});

router.get("/queue", async (req, res): Promise<void> => {
  await ensureSeed();
  const query = ListQueueQueryParams.safeParse({
    ...req.query,
    date: req.query.date ? new Date(String(req.query.date)) : undefined,
  });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(queueItemsTable.date, query.data.date ? dateString(query.data.date) : today())];
  if (query.data.doctorId) conditions.push(eq(queueItemsTable.doctorId, query.data.doctorId));
  const current = currentSession(req);
  if (current?.role === "patient" && current.patientId) conditions.push(eq(queueItemsTable.patientId, current.patientId));
  const rows = await db.select({ queue: queueItemsTable, patient: patientsTable, doctor: doctorsTable })
    .from(queueItemsTable)
    .innerJoin(patientsTable, eq(queueItemsTable.patientId, patientsTable.id))
    .innerJoin(doctorsTable, eq(queueItemsTable.doctorId, doctorsTable.id))
    .where(and(...conditions))
    .orderBy(asc(queueItemsTable.tokenNumber));
  const response = rows.map(({ queue, patient, doctor }) => ({
    id: queue.id,
    tokenNumber: queue.tokenNumber,
    patientId: queue.patientId,
    patientName: patient.name,
    doctorId: queue.doctorId,
    appointmentTime: queue.appointmentTime,
    source: queue.source,
    status: queue.status,
    estimatedWaitMinutes: queue.status === "waiting" ? Math.max(0, (queue.tokenNumber - doctor.currentToken - 1) * doctor.avgVisitMinutes + doctor.delayMinutes) : 0,
  }));
  res.json(ListQueueResponse.parse(response));
});

router.patch("/queue/:queueId/status", async (req, res): Promise<void> => {
  if (!requireRole(req, res, ["receptionist"])) return;
  await ensureSeed();
  const params = UpdateQueueStatusParams.safeParse(req.params);
  const body = UpdateQueueStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid queue status" });
    return;
  }
  const [updated] = await db.update(queueItemsTable).set({ status: body.data.status }).where(eq(queueItemsTable.id, params.data.queueId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Queue item not found" });
    return;
  }
  if (body.data.status === "in_room") {
    await db.update(doctorsTable).set({ currentToken: updated.tokenNumber }).where(eq(doctorsTable.id, updated.doctorId));
  }
  const rows = await db.select({ queue: queueItemsTable, patient: patientsTable, doctor: doctorsTable })
    .from(queueItemsTable)
    .innerJoin(patientsTable, eq(queueItemsTable.patientId, patientsTable.id))
    .innerJoin(doctorsTable, eq(queueItemsTable.doctorId, doctorsTable.id))
    .where(eq(queueItemsTable.id, updated.id));
  const row = rows[0];
  const response = {
    id: updated.id,
    tokenNumber: updated.tokenNumber,
    patientId: updated.patientId,
    patientName: row.patient.name,
    doctorId: updated.doctorId,
    appointmentTime: updated.appointmentTime,
    source: updated.source,
    status: updated.status,
    estimatedWaitMinutes: 0,
  };
  res.json(UpdateQueueStatusResponse.parse(response));
});

router.post("/tokens", async (req, res): Promise<void> => {
  if (!requireRole(req, res, ["receptionist"])) return;
  await ensureSeed();
  const body = GenerateTokenBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const doctor = await doctorById(body.data.doctorId);
  let patient = body.data.patientId
    ? (await db.select().from(patientsTable).where(eq(patientsTable.id, body.data.patientId)))[0]
    : undefined;
  if (!patient && body.data.patientName && body.data.patientPhone) {
    [patient] = await db.insert(patientsTable).values({
      name: body.data.patientName,
      email: `${body.data.patientPhone.replace(/\D/g, "") || Date.now()}@walkin.horizonclinic.demo`,
      phone: body.data.patientPhone,
      dateOfBirth: "1970-01-01",
      bloodGroup: "Unknown",
    }).returning();
  }
  if (!doctor || !patient) {
    res.status(404).json({ error: "Patient or doctor not found; provide an existing patient ID or walk-in name and phone" });
    return;
  }
  const [latest] = await db.select({ token: max(queueItemsTable.tokenNumber) }).from(queueItemsTable)
    .where(and(eq(queueItemsTable.doctorId, doctor.id), eq(queueItemsTable.date, today())));
  const tokenNumber = (latest.token ?? doctor.currentToken) + 1;
  const [queue] = await db.insert(queueItemsTable).values({
    tokenNumber,
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentTime: body.data.appointmentTime ?? "Walk-in",
    date: today(),
    source: body.data.source ?? "walk_in",
    status: "waiting",
  }).returning();
  const response = {
    id: queue.id,
    tokenNumber,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    appointmentTime: queue.appointmentTime,
    source: queue.source,
    status: queue.status,
    estimatedWaitMinutes: Math.max(0, (tokenNumber - doctor.currentToken - 1) * doctor.avgVisitMinutes + doctor.delayMinutes),
  };
  res.status(201).json(GenerateTokenResponse.parse(response));
});

router.get("/appointments", async (req, res): Promise<void> => {
  await ensureSeed();
  const query = ListAppointmentsQueryParams.safeParse({
    ...req.query,
    date: req.query.date ? new Date(String(req.query.date)) : undefined,
  });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  const current = currentSession(req);
  if (current?.role === "patient" && current.patientId) conditions.push(eq(appointmentsTable.patientId, current.patientId));
  else if (query.data.patientId) conditions.push(eq(appointmentsTable.patientId, query.data.patientId));
  if (query.data.date) conditions.push(eq(appointmentsTable.date, dateString(query.data.date)));
  const appointments = await db.select().from(appointmentsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(appointmentsTable.date), asc(appointmentsTable.time));
  res.json(ListAppointmentsResponse.parse(await Promise.all(appointments.map(appointmentResponse))));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const current = requireRole(req, res, ["patient"]);
  if (!current?.patientId) return;
  await ensureSeed();
  const body = CreateAppointmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [appointment] = await db.insert(appointmentsTable).values({
    ...body.data,
    patientId: current.patientId,
    date: dateString(body.data.date),
    status: "booked",
  }).returning();
  res.status(201).json(CreateAppointmentResponse.parse(appointment));
});

router.get("/patients/:patientId", async (req, res): Promise<void> => {
  await ensureSeed();
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const current = currentSession(req);
  if (current?.role === "patient" && current.patientId !== params.data.patientId) {
    res.status(403).json({ error: "Patients can only view their own profile" });
    return;
  }
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.patientId));
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(GetPatientResponse.parse(patient));
});

router.patch("/patients/:patientId", async (req, res): Promise<void> => {
  const current = requireRole(req, res, ["patient"]);
  if (!current?.patientId) return;
  await ensureSeed();
  const params = UpdatePatientParams.safeParse(req.params);
  const body = UpdatePatientBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid patient update" });
    return;
  }
  if (current.patientId !== params.data.patientId) {
    res.status(403).json({ error: "Patients can only update their own profile" });
    return;
  }
  const [patient] = await db.update(patientsTable).set({
    name: body.data.name,
    email: body.data.email,
    phone: body.data.phone,
    dateOfBirth: body.data.dateOfBirth ? dateString(body.data.dateOfBirth) : undefined,
    bloodGroup: body.data.bloodGroup,
  }).where(eq(patientsTable.id, params.data.patientId)).returning();
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(UpdatePatientResponse.parse(patient));
});

router.get("/patients/:patientId/visits", async (req, res): Promise<void> => {
  await ensureSeed();
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const current = currentSession(req);
  if (current?.role === "patient" && current.patientId !== params.data.patientId) {
    res.status(403).json({ error: "Patients can only view their own records" });
    return;
  }
  const rows = await db.select({ visit: visitsTable, doctor: doctorsTable })
    .from(visitsTable)
    .innerJoin(doctorsTable, eq(visitsTable.doctorId, doctorsTable.id))
    .where(eq(visitsTable.patientId, params.data.patientId))
    .orderBy(desc(visitsTable.date));
  const visits = rows.map(({ visit, doctor }) => ({
    ...visit,
    documents: current?.role === "receptionist" ? [] : visit.documents,
    doctorName: doctor.name,
  }));
  res.json(ListPatientVisitsResponse.parse(visits));
});

router.post("/patients/:patientId/visits", async (req, res): Promise<void> => {
  const current = requireRole(req, res, ["patient"]);
  if (!current?.patientId) return;
  await ensureSeed();
  const params = CreatePatientVisitParams.safeParse(req.params);
  const body = CreatePatientVisitBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid visit record" });
    return;
  }
  if (current.patientId !== params.data.patientId) {
    res.status(403).json({ error: "Patients can only add records to their own profile" });
    return;
  }
  const [visit] = await db.insert(visitsTable).values({
    ...body.data,
    date: dateString(body.data.date),
    patientId: params.data.patientId,
  }).returning();
  const doctor = await doctorById(visit.doctorId);
  const response = { ...visit, doctorName: doctor?.name ?? "Clinic doctor" };
  res.status(201).json(CreatePatientVisitResponse.parse(response));
});

export default router;