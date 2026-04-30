import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
  integer,
  date,
  decimal,
  time,
  text,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Clubs table - Top-level entity for multi-club support
// ============================================================================
export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubName: varchar("club_name").notNull(),
  createdOn: timestamp("created_on").defaultNow(),
  primaryCoachId: varchar("primary_coach_id"), // Set after first coach is created
  clubColor: varchar("club_color").default('#4B9A4A'), // Brand colour hex string
  // Stripe billing columns
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe Customer ID for this club
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Active Stripe Subscription ID
  activeUsers: integer("active_users").notNull().default(0), // Count of active users in the club
  clubStatus: varchar("club_status").notNull().default("active"), // "active" | "inactive"
});

export type Club = typeof clubs.$inferSelect;
export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdOn: true });
export type InsertClub = z.infer<typeof insertClubSchema>;

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Supports both Replit Auth (legacy) and Email/Password Auth (new)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // New fields for email/password authentication
  passwordHash: varchar("password_hash"), // bcrypt hashed password
  isEmailVerified: boolean("is_email_verified").default(false),
  accountStatus: varchar("account_status").default("pending"), // "pending" | "active" | "suspended"
  role: varchar("role").default("coach"), // "coach" | "admin"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Coaches table
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().references(() => users.id), // Made unique - one user per coach
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  level: varchar("level").notNull(), // "Level 3" | "Level 2" | "Level 1" | "No qualification"
  dob: date("dob"),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, {
    fields: [coaches.userId],
    references: [users.id],
  }),
  primarySquads: many(squads),
  leadSessions: many(swimmingSessions, { relationName: "leadCoach" }),
  secondSessions: many(swimmingSessions, { relationName: "secondCoach" }),
  helperSessions: many(swimmingSessions, { relationName: "helper" }),
  writerSessions: many(swimmingSessions, { relationName: "setWriter" }),
  competitionCoaching: many(competitionCoaching),
}));

export type Coach = typeof coaches.$inferSelect;
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;

// Schema for updating coach with userId (used when linking user to coach)
export const updateCoachWithUserSchema = createInsertSchema(coaches).pick({ userId: true });
export type UpdateCoachWithUser = z.infer<typeof updateCoachWithUserSchema>;

// Squads table
export const squads = pgTable("squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  squadName: varchar("squad_name").notNull(),
  color: varchar("color").notNull().default("#3B82F6"),
  primaryCoachId: varchar("primary_coach_id").references(() => coaches.id),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const squadsRelations = relations(squads, ({ one, many }) => ({
  primaryCoach: one(coaches, {
    fields: [squads.primaryCoachId],
    references: [coaches.id],
  }),
  swimmers: many(swimmers),
  sessions: many(swimmingSessions),
  sessionSquads: many(sessionSquads),
}));

export type Squad = typeof squads.$inferSelect;
export const insertSquadSchema = createInsertSchema(squads).omit({ id: true, createdAt: true, recordStatus: true }).extend({
  color: z.string().optional(),
});
export type InsertSquad = z.infer<typeof insertSquadSchema>;

// Swimmers table
export const swimmers = pgTable("swimmers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  squadId: varchar("squad_id").references(() => squads.id).notNull(),
  asaNumber: integer("asa_number").notNull(),
  dob: date("dob").notNull(),
  gender: varchar("gender").notNull().default("male"), // "male" | "female"
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const swimmersRelations = relations(swimmers, ({ one, many }) => ({
  squad: one(squads, {
    fields: [swimmers.squadId],
    references: [squads.id],
  }),
  attendance: many(attendance),
}));

export type Swimmer = typeof swimmers.$inferSelect;
export const insertSwimmerSchema = createInsertSchema(swimmers).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertSwimmer = z.infer<typeof insertSwimmerSchema>;

// Locations table
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  poolName: varchar("pool_name").notNull(),
  poolType: varchar("pool_type").notNull(), // "SC" (Short Course/25m) | "LC" (Long Course/50m)
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const locationsRelations = relations(locations, ({ many }) => ({
  sessions: many(swimmingSessions),
  competitions: many(competitions),
}));

export type Location = typeof locations.$inferSelect;
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;

// Swimming Sessions table
export const swimmingSessions = pgTable("swimming_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  sessionDate: date("session_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  duration: decimal("duration", { precision: 4, scale: 2 }).notNull(),
  poolId: varchar("pool_id").references(() => locations.id).notNull(),
  squadId: varchar("squad_id").references(() => squads.id).notNull(),
  leadCoachId: varchar("lead_coach_id").references(() => coaches.id).notNull(),
  secondCoachId: varchar("second_coach_id").references(() => coaches.id),
  helperId: varchar("helper_id").references(() => coaches.id),
  setWriterId: varchar("set_writer_id").references(() => coaches.id).notNull(),
  focus: varchar("focus").notNull(), // "Aerobic capacity" | "Anaerobic capacity" | "Speed" | "Technique" | "Recovery" | "Starts & turns"
  
  // Session content (raw text written by coach)
  sessionContent: text("session_content"),
  sessionContentHtml: text("session_content_html"),

  // Session notes (coach's additional notes for this session)
  sessionNotes: text("session_notes"),
  sessionNotesHtml: text("session_notes_html"),
  
  // Detected drills (AI-identified drill IDs from session content)
  detectedDrillIds: text("detected_drill_ids").array().default(sql`ARRAY[]::text[]`),
  
  // Distance fields
  totalDistance: integer("total_distance").notNull().default(0),
  
  // Front Crawl
  totalFrontCrawlSwim: integer("total_front_crawl_swim").notNull().default(0),
  totalFrontCrawlDrill: integer("total_front_crawl_drill").notNull().default(0),
  totalFrontCrawlKick: integer("total_front_crawl_kick").notNull().default(0),
  totalFrontCrawlPull: integer("total_front_crawl_pull").notNull().default(0),
  
  // Backstroke
  totalBackstrokeSwim: integer("total_backstroke_swim").notNull().default(0),
  totalBackstrokeDrill: integer("total_backstroke_drill").notNull().default(0),
  totalBackstrokeKick: integer("total_backstroke_kick").notNull().default(0),
  totalBackstrokePull: integer("total_backstroke_pull").notNull().default(0),
  
  // Breaststroke
  totalBreaststrokeSwim: integer("total_breaststroke_swim").notNull().default(0),
  totalBreaststrokeDrill: integer("total_breaststroke_drill").notNull().default(0),
  totalBreaststrokeKick: integer("total_breaststroke_kick").notNull().default(0),
  totalBreaststrokePull: integer("total_breaststroke_pull").notNull().default(0),
  
  // Butterfly
  totalButterflySwim: integer("total_butterfly_swim").notNull().default(0),
  totalButterflyDrill: integer("total_butterfly_drill").notNull().default(0),
  totalButterflyKick: integer("total_butterfly_kick").notNull().default(0),
  totalButterflyPull: integer("total_butterfly_pull").notNull().default(0),
  
  // IM (Individual Medley)
  totalIMSwim: integer("total_im_swim").notNull().default(0),
  totalIMDrill: integer("total_im_drill").notNull().default(0),
  totalIMKick: integer("total_im_kick").notNull().default(0),
  totalIMPull: integer("total_im_pull").notNull().default(0),
  
  // No1 (Swimmer's best stroke)
  totalNo1Swim: integer("total_no1_swim").notNull().default(0),
  totalNo1Drill: integer("total_no1_drill").notNull().default(0),
  totalNo1Kick: integer("total_no1_kick").notNull().default(0),
  totalNo1Pull: integer("total_no1_pull").notNull().default(0),
  
  // Duplication tracking - links to the source session if this was created via duplication
  duplicatedFromSessionId: varchar("duplicated_from_session_id"),
  
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const swimmingSessionsRelations = relations(swimmingSessions, ({ one, many }) => ({
  pool: one(locations, {
    fields: [swimmingSessions.poolId],
    references: [locations.id],
  }),
  squad: one(squads, {
    fields: [swimmingSessions.squadId],
    references: [squads.id],
  }),
  leadCoach: one(coaches, {
    fields: [swimmingSessions.leadCoachId],
    references: [coaches.id],
    relationName: "leadCoach",
  }),
  secondCoach: one(coaches, {
    fields: [swimmingSessions.secondCoachId],
    references: [coaches.id],
    relationName: "secondCoach",
  }),
  helper: one(coaches, {
    fields: [swimmingSessions.helperId],
    references: [coaches.id],
    relationName: "helper",
  }),
  setWriter: one(coaches, {
    fields: [swimmingSessions.setWriterId],
    references: [coaches.id],
    relationName: "setWriter",
  }),
  duplicatedFromSession: one(swimmingSessions, {
    fields: [swimmingSessions.duplicatedFromSessionId],
    references: [swimmingSessions.id],
    relationName: "duplicatedFrom",
  }),
  attendance: many(attendance),
  sessionSquads: many(sessionSquads),
}));

export type SwimmingSession = typeof swimmingSessions.$inferSelect;
export const insertSwimmingSessionSchema = createInsertSchema(swimmingSessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  recordStatus: true
});
export type InsertSwimmingSession = z.infer<typeof insertSwimmingSessionSchema>;

// Session Squads junction table - Links sessions to multiple squads
export const sessionSquads = pgTable("session_squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => swimmingSessions.id, { onDelete: 'cascade' }).notNull(),
  squadId: varchar("squad_id").references(() => squads.id).notNull(),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.sessionId, table.squadId),
]);

export const sessionSquadsRelations = relations(sessionSquads, ({ one }) => ({
  session: one(swimmingSessions, {
    fields: [sessionSquads.sessionId],
    references: [swimmingSessions.id],
  }),
  squad: one(squads, {
    fields: [sessionSquads.squadId],
    references: [squads.id],
  }),
}));

export type SessionSquad = typeof sessionSquads.$inferSelect;
export const insertSessionSquadSchema = createInsertSchema(sessionSquads).omit({ 
  id: true, 
  createdAt: true, 
  recordStatus: true 
});
export type InsertSessionSquad = z.infer<typeof insertSessionSquadSchema>;

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => swimmingSessions.id, { onDelete: 'cascade' }).notNull(),
  swimmerId: varchar("swimmer_id").references(() => swimmers.id).notNull(),
  status: varchar("status").notNull(), // "Present" | "First Half Only" | "Second Half Only" | "Absent"
  notes: varchar("notes"), // "Late" | "Very Late" | null (timeliness indicator)
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  session: one(swimmingSessions, {
    fields: [attendance.sessionId],
    references: [swimmingSessions.id],
  }),
  swimmer: one(swimmers, {
    fields: [attendance.swimmerId],
    references: [swimmers.id],
  }),
}));

export type Attendance = typeof attendance.$inferSelect;
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Authorized Invitations table - For invite-based registration
export const authorizedInvitations = pgTable("authorized_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club: which club this invite belongs to
  email: varchar("email").notNull().unique(), // Email invited
  coachId: varchar("coach_id").notNull().unique().references(() => coaches.id), // Pre-linked coach
  inviteToken: varchar("invite_token").notNull().unique(), // Unique token for registration link
  status: varchar("status").notNull().default("pending"), // "pending" | "accepted" | "expired" | "revoked"
  expiresAt: timestamp("expires_at").notNull(), // Token expiration (48 hours)
  createdBy: varchar("created_by").references(() => users.id), // Admin who sent invite
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const authorizedInvitationsRelations = relations(authorizedInvitations, ({ one }) => ({
  coach: one(coaches, {
    fields: [authorizedInvitations.coachId],
    references: [coaches.id],
  }),
  creator: one(users, {
    fields: [authorizedInvitations.createdBy],
    references: [users.id],
  }),
}));

export type AuthorizedInvitation = typeof authorizedInvitations.$inferSelect;
export const insertAuthorizedInvitationSchema = createInsertSchema(authorizedInvitations).omit({ 
  id: true, 
  createdAt: true, 
  acceptedAt: true 
});
export type InsertAuthorizedInvitation = z.infer<typeof insertAuthorizedInvitationSchema>;

// Schema for creating invitation via API (only requires email + coachId)
// Server generates token, status, and expiration
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  coachId: z.string().min(1, 'Coach ID required'),
});
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

// Email Verification Tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// ============================================================================
// Authentication Schemas (Email/Password)
// ============================================================================

// Strong password validation (reusable)
const strongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration schema
export const registrationSchema = z.object({
  inviteToken: z.string().min(1, 'Invitation token required'),
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  passwordConfirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.passwordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['passwordConfirm'],
    });
  }
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  password: strongPasswordSchema,
  passwordConfirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.passwordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['passwordConfirm'],
    });
  }
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Competitions Feature - NEW TABLES (No impact on existing functionality)
// ============================================================================

// Competitions table
export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  competitionName: varchar("competition_name").notNull(),
  locationId: varchar("location_id").references(() => locations.id).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  color: varchar("color").notNull().default("#3b82f6"), // For diagonal stripe pattern
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  location: one(locations, {
    fields: [competitions.locationId],
    references: [locations.id],
  }),
  coachingAssignments: many(competitionCoaching),
}));

export type Competition = typeof competitions.$inferSelect;
export const insertCompetitionSchema = createInsertSchema(competitions).omit({ 
  id: true, 
  createdAt: true, 
  recordStatus: true 
});
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

// Competition Coaching table
export const competitionCoaching = pgTable("competition_coaching", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").references(() => competitions.id, { onDelete: 'cascade' }).notNull(),
  coachId: varchar("coach_id").references(() => coaches.id).notNull(),
  coachingDate: date("coaching_date", { mode: "string" }).notNull(), // For multi-day competitions
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  duration: decimal("duration", { precision: 4, scale: 2 }).notNull(), // Hours (calculated)
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionCoachingRelations = relations(competitionCoaching, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionCoaching.competitionId],
    references: [competitions.id],
  }),
  coach: one(coaches, {
    fields: [competitionCoaching.coachId],
    references: [coaches.id],
  }),
}));

export type CompetitionCoaching = typeof competitionCoaching.$inferSelect;
export const insertCompetitionCoachingSchema = createInsertSchema(competitionCoaching).omit({ 
  id: true, 
  createdAt: true, 
  recordStatus: true 
});
export type InsertCompetitionCoaching = z.infer<typeof insertCompetitionCoachingSchema>;

// ============================================================================
// Coaching Rates - NEW TABLE (No impact on existing functionality)
// ============================================================================

// Coaching Rates table - Stores hourly rates and session writing rates for each qualification level per club
export const coachingRates = pgTable("coaching_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support — nullable until populated post-deploy
  qualificationLevel: varchar("qualification_level").notNull(), // "No Qualification" | "Level 1" | "Level 2" | "Level 3"
  hourlyRate: decimal("hourly_rate", { precision: 6, scale: 2 }).notNull(), // Hourly rate for coaching sessions and competitions
  sessionWritingRate: decimal("session_writing_rate", { precision: 6, scale: 2 }).notNull(), // Rate per session written
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.clubId, table.qualificationLevel),
]);

export type CoachingRate = typeof coachingRates.$inferSelect;
export const insertCoachingRateSchema = createInsertSchema(coachingRates).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCoachingRate = z.infer<typeof insertCoachingRateSchema>;

// Schema for updating rates (admin only)
export const updateCoachingRateSchema = z.object({
  qualificationLevel: z.enum(["No Qualification", "Level 1", "Level 2", "Level 3"]),
  hourlyRate: z.number().min(0, "Hourly rate must be non-negative"),
  sessionWritingRate: z.number().min(0, "Session writing rate must be non-negative"),
});
export type UpdateCoachingRate = z.infer<typeof updateCoachingRateSchema>;

// ============================================================================
// Session Templates - NEW TABLE (Session Library Feature)
// ============================================================================

// Session Templates table - Stores reusable session templates for coaches
export const sessionTemplates = pgTable("session_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  coachId: varchar("coach_id").references(() => coaches.id).notNull(), // Creator of the template
  templateName: varchar("template_name").notNull(),
  templateDescription: text("template_description"),
  sessionContent: text("session_content").notNull(), // Raw text content
  sessionContentHtml: text("session_content_html"), // HTML content from RichTextEditor
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionTemplatesRelations = relations(sessionTemplates, ({ one }) => ({
  coach: one(coaches, {
    fields: [sessionTemplates.coachId],
    references: [coaches.id],
  }),
}));

export type SessionTemplate = typeof sessionTemplates.$inferSelect;
export const insertSessionTemplateSchema = createInsertSchema(sessionTemplates).omit({ 
  id: true, 
  createdAt: true, 
  recordStatus: true 
});
export type InsertSessionTemplate = z.infer<typeof insertSessionTemplateSchema>;

// ============================================================================
// Drills Library - NEW TABLE (Drills Library Feature - No impact on existing functionality)
// ============================================================================

// Drills table - Stores swimming drills with videos for coaches
export const drills = pgTable("drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  coachId: varchar("coach_id").references(() => coaches.id).notNull(), // Creator of the drill
  drillName: varchar("drill_name").notNull(),
  strokeType: varchar("stroke_type").notNull(), // "Freestyle" | "Backstroke" | "Breaststroke" | "Butterfly" | "Starts" | "Turns"
  drillDescription: text("drill_description"), // Optional description
  videoUrl: text("video_url"), // Optional YouTube embed URL or video file URL
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const drillsRelations = relations(drills, ({ one }) => ({
  coach: one(coaches, {
    fields: [drills.coachId],
    references: [coaches.id],
  }),
}));

export type Drill = typeof drills.$inferSelect;
export const insertDrillSchema = createInsertSchema(drills).omit({ 
  id: true, 
  createdAt: true, 
  recordStatus: true 
});
export type InsertDrill = z.infer<typeof insertDrillSchema>;

// ============================================================================
// Session Feedback - NEW TABLE (Feedback Feature - No impact on existing functionality)
// ============================================================================

// Session Feedback table - Stores coach feedback for swimming sessions (1 per session)
export const sessionFeedback = pgTable("session_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  sessionId: varchar("session_id").references(() => swimmingSessions.id, { onDelete: 'cascade' }).notNull().unique(), // One feedback per session
  coachId: varchar("coach_id").references(() => coaches.id).notNull(), // Coach who submitted the feedback
  
  // 6 Rating Categories (1-10 scale)
  engagement: integer("engagement").notNull(), // How actively swimmers participated
  effortAndIntent: integer("effort_and_intent").notNull(), // How hard swimmers worked
  enjoyment: integer("enjoyment").notNull(), // How much fun swimmers had
  sessionClarity: integer("session_clarity").notNull(), // How clear instructions were
  appropriatenessOfChallenge: integer("appropriateness_of_challenge").notNull(), // Whether difficulty was right
  sessionFlow: integer("session_flow").notNull(), // How well session ran logistically
  
  notes: text("notes"), // Optional additional observations
  isPrivate: boolean("is_private").notNull().default(false), // If true, only visible to submitter
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionFeedbackRelations = relations(sessionFeedback, ({ one }) => ({
  session: one(swimmingSessions, {
    fields: [sessionFeedback.sessionId],
    references: [swimmingSessions.id],
  }),
  coach: one(coaches, {
    fields: [sessionFeedback.coachId],
    references: [coaches.id],
  }),
}));

export type SessionFeedback = typeof sessionFeedback.$inferSelect;
export const insertSessionFeedbackSchema = createInsertSchema(sessionFeedback).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  engagement: z.number().min(1).max(10),
  effortAndIntent: z.number().min(1).max(10),
  enjoyment: z.number().min(1).max(10),
  sessionClarity: z.number().min(1).max(10),
  appropriatenessOfChallenge: z.number().min(1).max(10),
  sessionFlow: z.number().min(1).max(10),
});
export type InsertSessionFeedback = z.infer<typeof insertSessionFeedbackSchema>;

// ============================================================================
// Push Notifications - NEW TABLES (Phone Notifications Feature)
// ============================================================================

// Device Tokens table - Stores iOS device tokens for push notifications
export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").references(() => coaches.id, { onDelete: 'cascade' }).notNull(),
  deviceToken: varchar("device_token").notNull().unique(), // APNs device token
  platform: varchar("platform").notNull().default("ios"), // "ios" | "android" (for future)
  isActive: boolean("is_active").notNull().default(true), // Can be disabled if token becomes invalid
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  coach: one(coaches, {
    fields: [deviceTokens.coachId],
    references: [coaches.id],
  }),
}));

export type DeviceToken = typeof deviceTokens.$inferSelect;
export const insertDeviceTokenSchema = createInsertSchema(deviceTokens).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isActive: true 
});
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;

// Notification Log table - Tracks sent push notifications to prevent duplicates
export const notificationLog = pgTable("notification_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => swimmingSessions.id, { onDelete: 'cascade' }).notNull(),
  coachId: varchar("coach_id").references(() => coaches.id, { onDelete: 'cascade' }).notNull(),
  notificationType: varchar("notification_type").notNull(), // "attendance_reminder" | "feedback_reminder" | "both_reminder"
  reminderNumber: integer("reminder_number").notNull(), // 1 = first reminder (1hr after), 2 = second reminder (8:30am next day)
  status: varchar("status").notNull().default("sent"), // "sent" | "failed" | "delivered"
  messageContent: text("message_content"), // The actual message that was sent
  sentAt: timestamp("sent_at").defaultNow(),
});

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
  session: one(swimmingSessions, {
    fields: [notificationLog.sessionId],
    references: [swimmingSessions.id],
  }),
  coach: one(coaches, {
    fields: [notificationLog.coachId],
    references: [coaches.id],
  }),
}));

export type NotificationLog = typeof notificationLog.$inferSelect;
export const insertNotificationLogSchema = createInsertSchema(notificationLog).omit({ 
  id: true, 
  sentAt: true 
});
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

// ============================================================================
// Coach Notes (Handbook Notes Feature)
// ============================================================================

export const coachNotes = pgTable("coach_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").references(() => clubs.id), // Multi-club support
  title: varchar("title").notNull(),
  type: varchar("type").notNull(), // 'text' | 'checklist'
  content: text("content"), // populated only when type = 'text'
  status: varchar("status").notNull().default("open"), // 'open' | 'closed'
  creatorId: varchar("creator_id").references(() => coaches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coachNoteItems = pgTable("coach_note_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id").references(() => coachNotes.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coachNoteSquads = pgTable("coach_note_squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id").references(() => coachNotes.id, { onDelete: "cascade" }).notNull(),
  squadId: varchar("squad_id").references(() => squads.id, { onDelete: "cascade" }).notNull(),
}, (table) => [unique().on(table.noteId, table.squadId)]);

export const coachNotesRelations = relations(coachNotes, ({ one, many }) => ({
  creator: one(coaches, {
    fields: [coachNotes.creatorId],
    references: [coaches.id],
  }),
  items: many(coachNoteItems),
  noteSquads: many(coachNoteSquads),
}));

export const coachNoteItemsRelations = relations(coachNoteItems, ({ one }) => ({
  note: one(coachNotes, {
    fields: [coachNoteItems.noteId],
    references: [coachNotes.id],
  }),
}));

export const coachNoteSquadsRelations = relations(coachNoteSquads, ({ one }) => ({
  note: one(coachNotes, {
    fields: [coachNoteSquads.noteId],
    references: [coachNotes.id],
  }),
  squad: one(squads, {
    fields: [coachNoteSquads.squadId],
    references: [squads.id],
  }),
}));

export type CoachNote = typeof coachNotes.$inferSelect;
export type InsertCoachNote = typeof coachNotes.$inferInsert;
export const insertCoachNoteSchema = createInsertSchema(coachNotes).omit({ id: true, createdAt: true, updatedAt: true });

export type CoachNoteItem = typeof coachNoteItems.$inferSelect;
export type InsertCoachNoteItem = typeof coachNoteItems.$inferInsert;
export const insertCoachNoteItemSchema = createInsertSchema(coachNoteItems).omit({ id: true, createdAt: true });

export type CoachNoteSquad = typeof coachNoteSquads.$inferSelect;
export type InsertCoachNoteSquad = typeof coachNoteSquads.$inferInsert;

// ============================================================================
// Pending Registrations table - Temporary store for club registrations awaiting Stripe checkout
// ============================================================================
export const pendingRegistrations = pgTable("pending_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id").notNull().unique(),
  formData: jsonb("form_data").notNull(), // Serialised form fields incl. password hash
  createdAt: timestamp("created_at").defaultNow(),
});

export type PendingRegistration = typeof pendingRegistrations.$inferSelect;
export type InsertPendingRegistration = typeof pendingRegistrations.$inferInsert;

// ============================================================================
// Club Registration Schema (for new club self-registration flow)
// ============================================================================

export const clubRegistrationSchema = z.object({
  clubName: z.string().min(2, 'Club name must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dob: z.string().optional(),
  level: z.enum(["No Qualification", "Level 1", "Level 2", "Level 3"], {
    required_error: 'Qualification level is required',
  }),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  passwordConfirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.passwordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['passwordConfirm'],
    });
  }
});

export type ClubRegistrationInput = z.infer<typeof clubRegistrationSchema>;

// ============================================================================
// Handbook Documents table
// ============================================================================
export const handbookDocuments = pgTable("handbook_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").notNull().references(() => clubs.id),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
  name: varchar("name").notNull(),
  fileType: varchar("file_type").notNull(),
  size: integer("size").notNull(),
  category: varchar("category").notNull(),
  fileData: text("file_data").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  recordStatus: varchar("record_status").notNull().default("active"),
});

export type HandbookDocument = typeof handbookDocuments.$inferSelect;
export const insertHandbookDocumentSchema = createInsertSchema(handbookDocuments).omit({ id: true, uploadedAt: true, recordStatus: true });
export type InsertHandbookDocument = z.infer<typeof insertHandbookDocumentSchema>;
