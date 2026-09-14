import { createInsertSchema } from "drizzle-zod";
import {
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const doctorsTable = pgTable("clinic_doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  room: text("room").notNull(),
  status: text("status").notNull().default("on_time"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  currentToken: integer("current_token").notNull().default(0),
  avgVisitMinutes: integer("avg_visit_minutes").notNull().default(15),
});

export const patientsTable = pgTable("clinic_patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
  bloodGroup: text("blood_group").notNull(),
});

export const appointmentsTable = pgTable("clinic_appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("booked"),
  tokenNumber: integer("token_number"),
});

export const queueItemsTable = pgTable("clinic_queue_items", {
  id: serial("id").primaryKey(),
  tokenNumber: integer("token_number").notNull(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("waiting"),
  source: text("source").notNull().default("online"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visitsTable = pgTable("clinic_visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  diagnosis: text("diagnosis").notNull(),
  notes: text("notes").notNull(),
  prescriptions: jsonb("prescriptions").$type<PrescriptionMedication[]>().notNull(),
  documents: jsonb("documents").$type<MedicalDocument[]>().notNull().default([]),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true });
export const insertQueueItemSchema = createInsertSchema(queueItemsTable).omit({ id: true, createdAt: true });
export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true });

export type PrescriptionMedication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};
export type MedicalDocument = {
  name: string;
  objectPath: string;
  contentType: string;
  size: number;
};
export type Doctor = typeof doctorsTable.$inferSelect;
export type Patient = typeof patientsTable.$inferSelect;
export type Appointment = typeof appointmentsTable.$inferSelect;
export type QueueItem = typeof queueItemsTable.$inferSelect;
export type Visit = typeof visitsTable.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertQueueItem = z.infer<typeof insertQueueItemSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;