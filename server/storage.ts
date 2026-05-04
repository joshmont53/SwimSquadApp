// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  clubs,
  coaches,
  squads,
  swimmers,
  locations,
  swimmingSessions,
  attendance,
  authorizedInvitations,
  emailVerificationTokens,
  passwordResetTokens,
  competitions,
  competitionCoaching,
  coachingRates,
  sessionTemplates,
  drills,
  sessionFeedback,
  sessionSquads,
  deviceTokens,
  notificationLog,
  coachNotes,
  coachNoteItems,
  coachNoteSquads,
  pendingRegistrations,
  handbookDocuments,
  recurringSessions,
  recurringSessionSquads,
  absencePeriods,
  coverOpportunities,
  floatSessions,
  type PendingRegistration,
  type InsertPendingRegistration,
  type Club,
  type InsertClub,
  type CoachNote,
  type InsertCoachNote,
  type CoachNoteItem,
  type InsertCoachNoteItem,
  type CoachNoteSquad,
  type User,
  type UpsertUser,
  type Coach,
  type InsertCoach,
  type Squad,
  type InsertSquad,
  type Swimmer,
  type InsertSwimmer,
  type Location,
  type InsertLocation,
  type SwimmingSession,
  type InsertSwimmingSession,
  type Attendance,
  type InsertAttendance,
  type AuthorizedInvitation,
  type InsertAuthorizedInvitation,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Competition,
  type InsertCompetition,
  type CompetitionCoaching,
  type InsertCompetitionCoaching,
  type CoachingRate,
  type InsertCoachingRate,
  type SessionTemplate,
  type InsertSessionTemplate,
  type Drill,
  type InsertDrill,
  type SessionFeedback,
  type InsertSessionFeedback,
  type SessionSquad,
  type InsertSessionSquad,
  type DeviceToken,
  type InsertDeviceToken,
  type NotificationLog,
  type InsertNotificationLog,
  type HandbookDocument,
  type InsertHandbookDocument,
  type RecurringSession,
  type InsertRecurringSession,
  type RecurringSessionSquad,
  type InsertRecurringSessionSquad,
  type AbsencePeriod,
  type InsertAbsencePeriod,
  type CoverOpportunity,
  type InsertCoverOpportunity,
  type FloatSession,
  type InsertFloatSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, count, gte, lte, or } from "drizzle-orm";

export type { Club, InsertClub, CoachNote, InsertCoachNote, CoachNoteItem, InsertCoachNoteItem, CoachNoteSquad };

export interface IStorage {
  // User operations (required for Replit Auth + Email/Password Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;

  // Club operations (Multi-club support)
  getClub(id: string): Promise<Club | undefined>;
  getClubByCoachId(coachId: string): Promise<Club | undefined>;
  getClubByStripeCustomerId(stripeCustomerId: string): Promise<Club | undefined>;
  createClub(club: InsertClub): Promise<Club>;
  updateClub(id: string, club: Partial<InsertClub>): Promise<Club>;
  seedClubCoachingRates(clubId: string): Promise<void>;
  recalculateActiveUsers(clubId: string): Promise<number>;
  
  // Coach operations
  getCoaches(clubId: string): Promise<Coach[]>;
  getAllCoachesIncludingInactive(clubId: string): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  getCoachAnyStatus(id: string): Promise<Coach | undefined>;
  getCoachByUserId(userId: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  linkUserToCoach(coachId: string, userId: string): Promise<void>;
  deleteCoach(id: string): Promise<void>;
  deactivateCoach(id: string): Promise<{ coach: Coach; userId: string | null }>;
  reactivateCoach(id: string): Promise<{ coach: Coach; userId: string | null }>;
  cancelClub(clubId: string): Promise<void>;
  
  // Squad operations
  getSquads(clubId: string): Promise<Squad[]>;
  getSquad(id: string): Promise<Squad | undefined>;
  createSquad(squad: InsertSquad): Promise<Squad>;
  updateSquad(id: string, squad: Partial<InsertSquad>): Promise<Squad>;
  deleteSquad(id: string): Promise<void>;
  
  // Swimmer operations
  getSwimmers(clubId: string): Promise<Swimmer[]>;
  getSwimmer(id: string): Promise<Swimmer | undefined>;
  createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer>;
  updateSwimmer(id: string, swimmer: Partial<InsertSwimmer>): Promise<Swimmer>;
  deleteSwimmer(id: string): Promise<void>;
  bulkUpdateSwimmerSquad(swimmerIds: string[], newSquadId: string): Promise<Swimmer[]>;
  
  // Location operations
  getLocations(clubId: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;
  
  // Session operations
  getSessions(clubId: string): Promise<SwimmingSession[]>;
  getSession(id: string): Promise<SwimmingSession | undefined>;
  getSessionsByDate(date: string, clubId?: string): Promise<SwimmingSession[]>;
  getSessionWithAttendance(id: string): Promise<{ session: SwimmingSession; attendance: Attendance[] } | undefined>;
  createSession(session: InsertSwimmingSession): Promise<SwimmingSession>;
  updateSession(id: string, session: Partial<InsertSwimmingSession>): Promise<SwimmingSession>;
  deleteSession(id: string): Promise<void>;
  
  // Attendance operations
  getAllAttendance(clubId: string): Promise<Attendance[]>;
  getAttendanceBySession(sessionId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  deleteAttendanceBySession(sessionId: string): Promise<void>;
  
  // Invitation operations (for email/password auth)
  createInvitation(invitation: InsertAuthorizedInvitation): Promise<AuthorizedInvitation>;
  getInvitationByToken(token: string): Promise<AuthorizedInvitation | undefined>;
  getInvitationByEmail(email: string): Promise<AuthorizedInvitation | undefined>;
  updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<AuthorizedInvitation>;
  claimInvitation(id: string): Promise<AuthorizedInvitation>;
  revertInvitationToPending(id: string): Promise<void>;
  getAllInvitations(clubId: string): Promise<AuthorizedInvitation[]>;
  
  // Email verification operations
  createVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteVerificationToken(id: string): Promise<void>;
  deleteVerificationTokensForUser(userId: string): Promise<void>;

  // Password reset operations
  createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  deletePasswordResetTokensForUser(userId: string): Promise<void>;

  // Competition operations
  getCompetitions(clubId: string): Promise<Competition[]>;
  getCompetition(id: string): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition>;
  deleteCompetition(id: string): Promise<void>;
  
  // Competition Coaching operations
  getCompetitionCoachingByCompetition(competitionId: string): Promise<CompetitionCoaching[]>;
  getAllCompetitionCoaching(): Promise<CompetitionCoaching[]>;
  createCompetitionCoaching(coaching: InsertCompetitionCoaching): Promise<CompetitionCoaching>;
  deleteCompetitionCoachingByCompetition(competitionId: string): Promise<void>;
  deleteCompetitionCoaching(id: string): Promise<void>;
  
  // Coaching Rates operations (now club-scoped)
  getAllCoachingRates(clubId: string): Promise<CoachingRate[]>;
  getCoachingRate(clubId: string, qualificationLevel: string): Promise<CoachingRate | undefined>;
  updateCoachingRate(clubId: string, qualificationLevel: string, rate: Partial<InsertCoachingRate>): Promise<CoachingRate>;
  
  // Session Template operations
  getSessionTemplates(clubId: string): Promise<SessionTemplate[]>;
  getSessionTemplate(id: string): Promise<SessionTemplate | undefined>;
  createSessionTemplate(template: InsertSessionTemplate): Promise<SessionTemplate>;
  updateSessionTemplate(id: string, template: Partial<InsertSessionTemplate>): Promise<SessionTemplate>;
  deleteSessionTemplate(id: string): Promise<void>;
  
  // Drill operations
  getDrills(clubId: string): Promise<Drill[]>;
  getDrill(id: string): Promise<Drill | undefined>;
  createDrill(drill: InsertDrill): Promise<Drill>;
  updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill>;
  deleteDrill(id: string): Promise<void>;
  
  // Session Squads operations
  getAllSessionSquads(): Promise<SessionSquad[]>;
  getSessionSquads(sessionId: string): Promise<SessionSquad[]>;
  createSessionSquad(sessionSquad: InsertSessionSquad): Promise<SessionSquad>;
  deactivateSessionSquad(sessionId: string, squadId: string): Promise<void>;

  // Session Feedback operations
  getFeedbackBySession(sessionId: string): Promise<SessionFeedback | undefined>;
  getAllFeedback(clubId: string): Promise<SessionFeedback[]>;
  createOrUpdateFeedback(feedback: InsertSessionFeedback): Promise<SessionFeedback>;
  deleteFeedback(id: string): Promise<void>;
  
  // Device Token operations
  getDeviceTokensByCoach(coachId: string): Promise<DeviceToken[]>;
  getDeviceTokenByToken(token: string): Promise<DeviceToken | undefined>;
  createOrUpdateDeviceToken(coachId: string, deviceToken: string, platform?: string): Promise<DeviceToken>;
  deleteDeviceToken(deviceToken: string): Promise<void>;
  deactivateDeviceToken(deviceToken: string): Promise<void>;
  
  // Notification Log operations
  getNotificationLog(sessionId: string, coachId: string, reminderNumber: number): Promise<NotificationLog | undefined>;
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;

  // Coach Notes operations
  getCoachNotes(coachId: string, clubId: string): Promise<(CoachNote & { items: CoachNoteItem[]; squadIds: string[] })[]>;
  getCoachNote(id: string): Promise<(CoachNote & { items: CoachNoteItem[]; squadIds: string[] }) | undefined>;
  createCoachNote(note: InsertCoachNote, itemTexts: string[], squadIds: string[]): Promise<CoachNote & { items: CoachNoteItem[]; squadIds: string[] }>;
  updateCoachNote(id: string, note: Partial<InsertCoachNote>, itemTexts?: { id?: string; text: string; completed: boolean; sortOrder: number }[], squadIds?: string[]): Promise<CoachNote & { items: CoachNoteItem[]; squadIds: string[] }>;
  deleteCoachNote(id: string): Promise<void>;
  updateCoachNoteItem(itemId: string, completed: boolean): Promise<CoachNoteItem>;

  // Pending Registration operations (for Stripe Checkout flow)
  createPendingRegistration(data: InsertPendingRegistration): Promise<PendingRegistration>;
  getPendingRegistrationBySessionId(stripeCheckoutSessionId: string): Promise<PendingRegistration | undefined>;
  deletePendingRegistration(id: string): Promise<void>;

  // Handbook Document operations
  getHandbookDocuments(clubId: string): Promise<HandbookDocument[]>;
  createHandbookDocument(data: InsertHandbookDocument): Promise<HandbookDocument>;
  deleteHandbookDocument(id: string): Promise<void>;

  // Recurring Sessions operations
  getRecurringSessions(clubId: string): Promise<(RecurringSession & { squadIds: string[] })[]>;
  createRecurringSession(data: InsertRecurringSession, squadIds: string[]): Promise<RecurringSession & { squadIds: string[] }>;
  updateRecurringSession(id: string, clubId: string, data: Partial<InsertRecurringSession>, squadIds?: string[]): Promise<RecurringSession & { squadIds: string[] }>;
  deleteRecurringSession(id: string, clubId: string): Promise<void>;

  // Absence Periods operations
  getAbsencePeriods(clubId: string): Promise<AbsencePeriod[]>;
  getAbsencePeriodsByCoach(coachId: string): Promise<AbsencePeriod[]>;
  createAbsencePeriod(data: InsertAbsencePeriod): Promise<AbsencePeriod>;
  deleteAbsencePeriod(id: string, coachId: string, clubId: string): Promise<void>;

  // Cover Opportunities operations
  getCoverOpportunities(clubId: string): Promise<CoverOpportunity[]>;
  getCoverOpportunitiesByCoach(requesterCoachId: string): Promise<CoverOpportunity[]>;
  createCoverOpportunity(data: InsertCoverOpportunity): Promise<CoverOpportunity>;
  updateCoverOpportunity(id: string, clubId: string, data: Partial<InsertCoverOpportunity>): Promise<CoverOpportunity>;
  deleteCoverOpportunity(id: string, requesterCoachId: string, clubId: string): Promise<void>;

  // Float Sessions operations
  getFloatSessions(clubId: string): Promise<FloatSession[]>;
  getFloatSessionsByCoach(coachId: string): Promise<FloatSession[]>;
  createFloatSession(data: InsertFloatSession): Promise<FloatSession>;
  deleteFloatSession(id: string, clubId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email!));
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return user;
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Club operations
  async getClub(id: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async getClubByCoachId(coachId: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.primaryCoachId, coachId));
    return club;
  }

  async getClubByStripeCustomerId(stripeCustomerId: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.stripeCustomerId, stripeCustomerId));
    return club;
  }

  async createClub(club: InsertClub): Promise<Club> {
    const [newClub] = await db.insert(clubs).values(club).returning();
    return newClub;
  }

  async updateClub(id: string, club: Partial<InsertClub>): Promise<Club> {
    const [updatedClub] = await db.update(clubs).set(club).where(eq(clubs.id, id)).returning();
    if (!updatedClub) throw new Error("Club not found");
    return updatedClub;
  }

  async seedClubCoachingRates(clubId: string): Promise<void> {
    const defaultRates = [
      { clubId, qualificationLevel: 'Level 1', hourlyRate: '15.00', sessionWritingRate: '5.00' },
      { clubId, qualificationLevel: 'Level 2', hourlyRate: '17.50', sessionWritingRate: '6.00' },
      { clubId, qualificationLevel: 'Level 3', hourlyRate: '20.00', sessionWritingRate: '7.50' },
      { clubId, qualificationLevel: 'Level 4', hourlyRate: '25.00', sessionWritingRate: '10.00' },
    ];
    await db.insert(coachingRates).values(defaultRates).onConflictDoNothing();
  }

  async recalculateActiveUsers(clubId: string): Promise<number> {
    // Count users who have an active coach in the given club AND whose accountStatus is 'active'
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(coaches, eq(coaches.userId, users.id))
      .where(
        and(
          eq(coaches.clubId, clubId),
          eq(coaches.recordStatus, 'active'),
          eq(users.accountStatus, 'active'),
        )
      );

    const activeCount = result?.count ?? 0;

    // Persist the updated count on the club record
    await db
      .update(clubs)
      .set({ activeUsers: activeCount })
      .where(eq(clubs.id, clubId));

    return activeCount;
  }

  // Coach operations
  async getCoaches(clubId: string): Promise<Coach[]> {
    return await db.select().from(coaches).where(and(eq(coaches.clubId, clubId), eq(coaches.recordStatus, 'active')));
  }

  async getAllCoachesIncludingInactive(clubId: string): Promise<Coach[]> {
    return await db.select().from(coaches).where(eq(coaches.clubId, clubId));
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(and(eq(coaches.id, id), eq(coaches.recordStatus, 'active')));
    return coach;
  }

  async getCoachAnyStatus(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(and(eq(coaches.userId, userId), eq(coaches.recordStatus, 'active')));
    return coach;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const [newCoach] = await db.insert(coaches).values(coach).returning();
    return newCoach;
  }

  async updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach> {
    const [updatedCoach] = await db
      .update(coaches)
      .set(coach)
      .where(eq(coaches.id, id))
      .returning();
    if (!updatedCoach) {
      throw new Error("Coach not found");
    }
    return updatedCoach;
  }

  async linkUserToCoach(coachId: string, userId: string): Promise<void> {
    const result = await db
      .update(coaches)
      .set({ userId })
      .where(eq(coaches.id, coachId))
      .returning();
    if (result.length === 0) {
      throw new Error("Coach not found");
    }
  }

  async deleteCoach(id: string): Promise<void> {
    const result = await db
      .update(coaches)
      .set({ recordStatus: 'inactive' })
      .where(eq(coaches.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Coach not found");
    }
  }

  async deactivateCoach(id: string): Promise<{ coach: Coach; userId: string | null }> {
    const [coach] = await db
      .update(coaches)
      .set({ recordStatus: 'inactive' })
      .where(eq(coaches.id, id))
      .returning();
    if (!coach) throw new Error("Coach not found");
    // Deactivate linked user if one exists
    if (coach.userId) {
      await db
        .update(users)
        .set({ accountStatus: 'inactive' })
        .where(eq(users.id, coach.userId));
    }
    return { coach, userId: coach.userId ?? null };
  }

  async reactivateCoach(id: string): Promise<{ coach: Coach; userId: string | null }> {
    const [coach] = await db
      .update(coaches)
      .set({ recordStatus: 'active' })
      .where(eq(coaches.id, id))
      .returning();
    if (!coach) throw new Error("Coach not found");
    // Re-activate linked user if one exists
    if (coach.userId) {
      await db
        .update(users)
        .set({ accountStatus: 'active' })
        .where(eq(users.id, coach.userId));
    }
    return { coach, userId: coach.userId ?? null };
  }

  async cancelClub(clubId: string): Promise<void> {
    // Set all coaches to inactive
    await db
      .update(coaches)
      .set({ recordStatus: 'inactive' })
      .where(eq(coaches.clubId, clubId));

    // Set all users linked to coaches in this club to inactive
    const clubCoaches = await db.select({ userId: coaches.userId }).from(coaches).where(eq(coaches.clubId, clubId));
    const userIds = clubCoaches.map(c => c.userId).filter((uid): uid is string => !!uid);
    if (userIds.length > 0) {
      await db
        .update(users)
        .set({ accountStatus: 'inactive' })
        .where(inArray(users.id, userIds));
    }

    // Set all swimmers to inactive
    await db.update(swimmers).set({ recordStatus: 'inactive' }).where(eq(swimmers.clubId, clubId));

    // Set all squads to inactive
    await db.update(squads).set({ recordStatus: 'inactive' }).where(eq(squads.clubId, clubId));

    // Set all sessions to inactive
    await db.update(swimmingSessions).set({ recordStatus: 'inactive' }).where(eq(swimmingSessions.clubId, clubId));

    // Set all locations to inactive
    await db.update(locations).set({ recordStatus: 'inactive' }).where(eq(locations.clubId, clubId));

    // Set the club itself to inactive with 0 active users and clear the subscription ID
    await db
      .update(clubs)
      .set({ clubStatus: 'inactive', activeUsers: 0, stripeSubscriptionId: null })
      .where(eq(clubs.id, clubId));
  }

  // Squad operations
  async getSquads(clubId: string): Promise<Squad[]> {
    return await db.select().from(squads).where(and(eq(squads.clubId, clubId), eq(squads.recordStatus, 'active')));
  }

  async getSquad(id: string): Promise<Squad | undefined> {
    const [squad] = await db.select().from(squads).where(and(eq(squads.id, id), eq(squads.recordStatus, 'active')));
    return squad;
  }

  async createSquad(squad: InsertSquad): Promise<Squad> {
    const [newSquad] = await db.insert(squads).values(squad).returning();
    return newSquad;
  }

  async updateSquad(id: string, squad: Partial<InsertSquad>): Promise<Squad> {
    const [updatedSquad] = await db
      .update(squads)
      .set(squad)
      .where(eq(squads.id, id))
      .returning();
    if (!updatedSquad) {
      throw new Error("Squad not found");
    }
    return updatedSquad;
  }

  async deleteSquad(id: string): Promise<void> {
    const result = await db
      .update(squads)
      .set({ recordStatus: 'inactive' })
      .where(eq(squads.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Squad not found");
    }
  }

  // Swimmer operations
  async getSwimmers(clubId: string): Promise<Swimmer[]> {
    return await db.select().from(swimmers).where(and(eq(swimmers.clubId, clubId), eq(swimmers.recordStatus, 'active')));
  }

  async getSwimmer(id: string): Promise<Swimmer | undefined> {
    const [swimmer] = await db.select().from(swimmers).where(and(eq(swimmers.id, id), eq(swimmers.recordStatus, 'active')));
    return swimmer;
  }

  async createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer> {
    const [newSwimmer] = await db.insert(swimmers).values(swimmer).returning();
    return newSwimmer;
  }

  async updateSwimmer(id: string, swimmer: Partial<InsertSwimmer>): Promise<Swimmer> {
    const [updatedSwimmer] = await db
      .update(swimmers)
      .set(swimmer)
      .where(eq(swimmers.id, id))
      .returning();
    if (!updatedSwimmer) {
      throw new Error("Swimmer not found");
    }
    return updatedSwimmer;
  }

  async deleteSwimmer(id: string): Promise<void> {
    const result = await db
      .update(swimmers)
      .set({ recordStatus: 'inactive' })
      .where(eq(swimmers.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Swimmer not found");
    }
  }

  async bulkUpdateSwimmerSquad(swimmerIds: string[], newSquadId: string): Promise<Swimmer[]> {
    if (swimmerIds.length === 0) {
      return [];
    }
    const updatedSwimmers = await db
      .update(swimmers)
      .set({ squadId: newSquadId })
      .where(inArray(swimmers.id, swimmerIds))
      .returning();
    return updatedSwimmers;
  }

  // Location operations
  async getLocations(clubId: string): Promise<Location[]> {
    return await db.select().from(locations).where(and(eq(locations.clubId, clubId), eq(locations.recordStatus, 'active')));
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(and(eq(locations.id, id), eq(locations.recordStatus, 'active')));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set(location)
      .where(eq(locations.id, id))
      .returning();
    if (!updatedLocation) {
      throw new Error("Location not found");
    }
    return updatedLocation;
  }

  async deleteLocation(id: string): Promise<void> {
    const result = await db
      .update(locations)
      .set({ recordStatus: 'inactive' })
      .where(eq(locations.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Location not found");
    }
  }

  // Session operations
  async getSessions(clubId: string): Promise<SwimmingSession[]> {
    return await db.select().from(swimmingSessions).where(and(eq(swimmingSessions.clubId, clubId), eq(swimmingSessions.recordStatus, 'active')));
  }

  async getSession(id: string): Promise<SwimmingSession | undefined> {
    const [session] = await db.select().from(swimmingSessions).where(and(eq(swimmingSessions.id, id), eq(swimmingSessions.recordStatus, 'active')));
    return session;
  }

  async getSessionsByDate(date: string, clubId?: string): Promise<SwimmingSession[]> {
    if (clubId) {
      return await db.select().from(swimmingSessions).where(
        and(eq(swimmingSessions.sessionDate, date), eq(swimmingSessions.clubId, clubId), eq(swimmingSessions.recordStatus, 'active'))
      );
    }
    return await db.select().from(swimmingSessions).where(
      and(eq(swimmingSessions.sessionDate, date), eq(swimmingSessions.recordStatus, 'active'))
    );
  }

  async getSessionWithAttendance(id: string): Promise<{ session: SwimmingSession; attendance: Attendance[] } | undefined> {
    const [session] = await db.select().from(swimmingSessions).where(and(eq(swimmingSessions.id, id), eq(swimmingSessions.recordStatus, 'active')));
    if (!session) {
      return undefined;
    }
    const attendanceRecords = await db.select().from(attendance).where(and(eq(attendance.sessionId, id), eq(attendance.recordStatus, 'active')));
    return { session, attendance: attendanceRecords };
  }

  async createSession(session: InsertSwimmingSession): Promise<SwimmingSession> {
    const [newSession] = await db.insert(swimmingSessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: string, session: Partial<InsertSwimmingSession>): Promise<SwimmingSession> {
    const [updatedSession] = await db
      .update(swimmingSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(swimmingSessions.id, id))
      .returning();
    if (!updatedSession) {
      throw new Error("Session not found");
    }
    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    // Soft delete the session
    const result = await db
      .update(swimmingSessions)
      .set({ recordStatus: 'inactive' })
      .where(eq(swimmingSessions.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Session not found");
    }
    
    // Also soft delete all associated attendance records
    await db
      .update(attendance)
      .set({ recordStatus: 'inactive' })
      .where(eq(attendance.sessionId, id));
  }

  // Attendance operations
  async getAllAttendance(clubId: string): Promise<Attendance[]> {
    const clubSessions = await db.select({ id: swimmingSessions.id }).from(swimmingSessions).where(
      and(eq(swimmingSessions.clubId, clubId), eq(swimmingSessions.recordStatus, 'active'))
    );
    if (clubSessions.length === 0) return [];
    const sessionIds = clubSessions.map(s => s.id);
    return await db.select().from(attendance).where(
      and(inArray(attendance.sessionId, sessionIds), eq(attendance.recordStatus, 'active'))
    );
  }

  async getAttendanceBySession(sessionId: string): Promise<Attendance[]> {
    return await db.select().from(attendance).where(and(eq(attendance.sessionId, sessionId), eq(attendance.recordStatus, 'active')));
  }

  async createAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceRecord).returning();
    return newAttendance;
  }

  async deleteAttendanceBySession(sessionId: string): Promise<void> {
    await db
      .update(attendance)
      .set({ recordStatus: 'inactive' })
      .where(eq(attendance.sessionId, sessionId));
  }

  // New Email/Password Auth operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Invitation operations
  async createInvitation(invitation: InsertAuthorizedInvitation): Promise<AuthorizedInvitation> {
    const [newInvitation] = await db.insert(authorizedInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<AuthorizedInvitation | undefined> {
    const [invitation] = await db.select().from(authorizedInvitations).where(eq(authorizedInvitations.inviteToken, token));
    return invitation;
  }

  async getInvitationByEmail(email: string): Promise<AuthorizedInvitation | undefined> {
    const [invitation] = await db.select().from(authorizedInvitations).where(eq(authorizedInvitations.email, email));
    return invitation;
  }

  async updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<AuthorizedInvitation> {
    const [updatedInvitation] = await db
      .update(authorizedInvitations)
      .set({ status, acceptedAt })
      .where(eq(authorizedInvitations.id, id))
      .returning();
    if (!updatedInvitation) {
      throw new Error("Invitation not found");
    }
    return updatedInvitation;
  }

  // Atomically claim an invitation (only succeeds if status is 'pending')
  async claimInvitation(id: string): Promise<AuthorizedInvitation> {
    const [claimedInvitation] = await db
      .update(authorizedInvitations)
      .set({ status: 'processing' })
      .where(and(
        eq(authorizedInvitations.id, id),
        eq(authorizedInvitations.status, 'pending')
      ))
      .returning();
    
    if (!claimedInvitation) {
      throw new Error("Invitation not available (already claimed or invalid status)");
    }
    
    return claimedInvitation;
  }

  // Revert invitation back to pending (for error recovery)
  async revertInvitationToPending(id: string): Promise<void> {
    await db
      .update(authorizedInvitations)
      .set({ status: 'pending' })
      .where(and(
        eq(authorizedInvitations.id, id),
        eq(authorizedInvitations.status, 'processing')
      ));
  }

  async getAllInvitations(clubId: string): Promise<AuthorizedInvitation[]> {
    return await db.select().from(authorizedInvitations).where(eq(authorizedInvitations.clubId, clubId));
  }

  // Email verification operations
  async createVerificationToken(tokenData: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [token] = await db.insert(emailVerificationTokens).values(tokenData).returning();
    return token;
  }

  async getVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async deleteVerificationToken(id: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, id));
  }
  
  async deleteVerificationTokensForUser(userId: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  }

  // Password reset operations
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  // ============================================================================
  // Competition operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getCompetitions(clubId: string): Promise<Competition[]> {
    return await db.select().from(competitions).where(and(eq(competitions.clubId, clubId), eq(competitions.recordStatus, 'active')));
  }

  async getCompetition(id: string): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(and(eq(competitions.id, id), eq(competitions.recordStatus, 'active')));
    return competition;
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const [newCompetition] = await db.insert(competitions).values(competition).returning();
    return newCompetition;
  }

  async updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition> {
    const [updatedCompetition] = await db
      .update(competitions)
      .set(competition)
      .where(eq(competitions.id, id))
      .returning();
    if (!updatedCompetition) {
      throw new Error("Competition not found");
    }
    return updatedCompetition;
  }

  async deleteCompetition(id: string): Promise<void> {
    // Soft delete the competition
    const result = await db
      .update(competitions)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitions.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Competition not found");
    }
    
    // Also soft delete all associated competition coaching records
    // (Note: Database CASCADE DELETE on FK handles hard deletes, but we use soft deletes)
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.competitionId, id));
  }

  // ============================================================================
  // Competition Coaching operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getCompetitionCoachingByCompetition(competitionId: string): Promise<CompetitionCoaching[]> {
    return await db.select().from(competitionCoaching).where(and(eq(competitionCoaching.competitionId, competitionId), eq(competitionCoaching.recordStatus, 'active')));
  }

  async getAllCompetitionCoaching(): Promise<CompetitionCoaching[]> {
    return await db.select().from(competitionCoaching).where(eq(competitionCoaching.recordStatus, 'active'));
  }

  async createCompetitionCoaching(coaching: InsertCompetitionCoaching): Promise<CompetitionCoaching> {
    const [newCoaching] = await db.insert(competitionCoaching).values(coaching).returning();
    return newCoaching;
  }

  async deleteCompetitionCoachingByCompetition(competitionId: string): Promise<void> {
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.competitionId, competitionId));
  }

  async deleteCompetitionCoaching(id: string): Promise<void> {
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.id, id));
  }

  // ============================================================================
  // Coaching Rates operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getAllCoachingRates(clubId: string): Promise<CoachingRate[]> {
    return await db.select().from(coachingRates).where(eq(coachingRates.clubId, clubId));
  }

  async getCoachingRate(clubId: string, qualificationLevel: string): Promise<CoachingRate | undefined> {
    const [rate] = await db.select().from(coachingRates).where(
      and(eq(coachingRates.clubId, clubId), eq(coachingRates.qualificationLevel, qualificationLevel))
    );
    return rate;
  }

  async updateCoachingRate(clubId: string, qualificationLevel: string, rate: Partial<InsertCoachingRate>): Promise<CoachingRate> {
    const [updatedRate] = await db
      .update(coachingRates)
      .set({
        ...rate,
        updatedAt: new Date(),
      })
      .where(and(eq(coachingRates.clubId, clubId), eq(coachingRates.qualificationLevel, qualificationLevel)))
      .returning();
    if (!updatedRate) {
      throw new Error("Coaching rate not found");
    }
    return updatedRate;
  }

  // ============================================================================
  // Session Template operations (Session Library Feature - No impact on existing functionality)
  // ============================================================================

  async getSessionTemplates(clubId: string): Promise<SessionTemplate[]> {
    return await db.select().from(sessionTemplates).where(and(eq(sessionTemplates.clubId, clubId), eq(sessionTemplates.recordStatus, 'active')));
  }

  async getSessionTemplate(id: string): Promise<SessionTemplate | undefined> {
    const [template] = await db.select().from(sessionTemplates).where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.recordStatus, 'active')));
    return template;
  }

  async createSessionTemplate(template: InsertSessionTemplate): Promise<SessionTemplate> {
    const [newTemplate] = await db.insert(sessionTemplates).values(template).returning();
    return newTemplate;
  }

  async updateSessionTemplate(id: string, template: Partial<InsertSessionTemplate>): Promise<SessionTemplate> {
    const [updatedTemplate] = await db
      .update(sessionTemplates)
      .set(template)
      .where(eq(sessionTemplates.id, id))
      .returning();
    if (!updatedTemplate) {
      throw new Error("Session template not found");
    }
    return updatedTemplate;
  }

  async deleteSessionTemplate(id: string): Promise<void> {
    const result = await db
      .update(sessionTemplates)
      .set({ recordStatus: 'inactive' })
      .where(eq(sessionTemplates.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Session template not found");
    }
  }

  // ============================================================================
  // Drill operations (Drills Library Feature - No impact on existing functionality)
  // ============================================================================

  async getDrills(clubId: string): Promise<Drill[]> {
    return await db.select().from(drills).where(and(eq(drills.clubId, clubId), eq(drills.recordStatus, 'active')));
  }

  async getDrill(id: string): Promise<Drill | undefined> {
    const [drill] = await db.select().from(drills).where(and(eq(drills.id, id), eq(drills.recordStatus, 'active')));
    return drill;
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill).returning();
    return newDrill;
  }

  async updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill> {
    const [updatedDrill] = await db
      .update(drills)
      .set(drill)
      .where(eq(drills.id, id))
      .returning();
    if (!updatedDrill) {
      throw new Error("Drill not found");
    }
    return updatedDrill;
  }

  async deleteDrill(id: string): Promise<void> {
    const result = await db
      .update(drills)
      .set({ recordStatus: 'inactive' })
      .where(eq(drills.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Drill not found");
    }
  }

  // ============================================================================
  // Session Squads operations (Multi-Squad Sessions Feature)
  // ============================================================================

  async getAllSessionSquads(): Promise<SessionSquad[]> {
    return await db.select().from(sessionSquads)
      .where(eq(sessionSquads.recordStatus, "active"));
  }

  async getSessionSquads(sessionId: string): Promise<SessionSquad[]> {
    return await db.select().from(sessionSquads)
      .where(and(eq(sessionSquads.sessionId, sessionId), eq(sessionSquads.recordStatus, "active")));
  }

  async createSessionSquad(sessionSquad: InsertSessionSquad): Promise<SessionSquad> {
    const [newSessionSquad] = await db.insert(sessionSquads).values(sessionSquad).returning();
    return newSessionSquad;
  }

  async deactivateSessionSquad(sessionId: string, squadId: string): Promise<void> {
    await db.update(sessionSquads)
      .set({ recordStatus: "inactive" })
      .where(and(eq(sessionSquads.sessionId, sessionId), eq(sessionSquads.squadId, squadId)));
  }

  async getAllSessionSquadsIncludingInactive(sessionId: string): Promise<SessionSquad[]> {
    return await db.select().from(sessionSquads)
      .where(eq(sessionSquads.sessionId, sessionId));
  }

  async reactivateSessionSquad(sessionId: string, squadId: string): Promise<void> {
    await db.update(sessionSquads)
      .set({ recordStatus: "active" })
      .where(and(eq(sessionSquads.sessionId, sessionId), eq(sessionSquads.squadId, squadId)));
  }

  async updateSessionSquads(sessionId: string, newSquadIds: string[]): Promise<void> {
    const existingAll = await this.getAllSessionSquadsIncludingInactive(sessionId);

    for (const squadId of newSquadIds) {
      const existing = existingAll.find(ss => ss.squadId === squadId);
      if (existing) {
        if (existing.recordStatus === "inactive") {
          await this.reactivateSessionSquad(sessionId, squadId);
        }
      } else {
        await this.createSessionSquad({ sessionId, squadId });
      }
    }

    for (const existing of existingAll) {
      if (!newSquadIds.includes(existing.squadId) && existing.recordStatus === "active") {
        await this.deactivateSessionSquad(sessionId, existing.squadId);
      }
    }
  }

  // ============================================================================
  // Session Feedback operations (Feedback Feature - No impact on existing functionality)
  // ============================================================================

  async getFeedbackBySession(sessionId: string): Promise<SessionFeedback | undefined> {
    const [feedback] = await db.select().from(sessionFeedback).where(eq(sessionFeedback.sessionId, sessionId));
    return feedback;
  }

  async getAllFeedback(clubId: string): Promise<SessionFeedback[]> {
    return await db.select().from(sessionFeedback).where(eq(sessionFeedback.clubId, clubId));
  }

  async createOrUpdateFeedback(feedback: InsertSessionFeedback): Promise<SessionFeedback> {
    // Check if feedback already exists for this session
    const existing = await this.getFeedbackBySession(feedback.sessionId);
    
    if (existing) {
      // Update existing feedback
      const [updatedFeedback] = await db
        .update(sessionFeedback)
        .set({ ...feedback, updatedAt: new Date() })
        .where(eq(sessionFeedback.id, existing.id))
        .returning();
      return updatedFeedback;
    } else {
      // Create new feedback
      const [newFeedback] = await db.insert(sessionFeedback).values(feedback).returning();
      return newFeedback;
    }
  }

  async deleteFeedback(id: string): Promise<void> {
    const result = await db
      .delete(sessionFeedback)
      .where(eq(sessionFeedback.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Feedback not found");
    }
  }

  // ============================================================================
  // Device Token operations (Push Notifications Feature - No impact on existing functionality)
  // ============================================================================

  async getDeviceTokensByCoach(coachId: string): Promise<DeviceToken[]> {
    return await db.select().from(deviceTokens).where(
      and(eq(deviceTokens.coachId, coachId), eq(deviceTokens.isActive, true))
    );
  }

  async getDeviceTokenByToken(token: string): Promise<DeviceToken | undefined> {
    const [deviceToken] = await db.select().from(deviceTokens).where(eq(deviceTokens.deviceToken, token));
    return deviceToken;
  }

  async createOrUpdateDeviceToken(coachId: string, token: string, platform: string = 'ios'): Promise<DeviceToken> {
    const existing = await this.getDeviceTokenByToken(token);
    
    if (existing) {
      const [updated] = await db
        .update(deviceTokens)
        .set({ 
          coachId, 
          platform, 
          isActive: true,
          updatedAt: new Date() 
        })
        .where(eq(deviceTokens.deviceToken, token))
        .returning();
      return updated;
    } else {
      const [newToken] = await db
        .insert(deviceTokens)
        .values({ coachId, deviceToken: token, platform })
        .returning();
      return newToken;
    }
  }

  async deleteDeviceToken(token: string): Promise<void> {
    await db.delete(deviceTokens).where(eq(deviceTokens.deviceToken, token));
  }

  async deactivateDeviceToken(token: string): Promise<void> {
    await db
      .update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(deviceTokens.deviceToken, token));
  }

  // ============================================================================
  // Notification Log operations (Push Notifications Feature - No impact on existing functionality)
  // ============================================================================

  async getNotificationLog(sessionId: string, coachId: string, reminderNumber: number): Promise<NotificationLog | undefined> {
    const [log] = await db.select().from(notificationLog).where(
      and(
        eq(notificationLog.sessionId, sessionId),
        eq(notificationLog.coachId, coachId),
        eq(notificationLog.reminderNumber, reminderNumber)
      )
    );
    return log;
  }

  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [newLog] = await db.insert(notificationLog).values(log).returning();
    return newLog;
  }

  // ============================================================================
  // Coach Notes operations (Handbook Notes Feature)
  // ============================================================================

  private async _enrichNote(note: CoachNote): Promise<CoachNote & { items: CoachNoteItem[]; squadIds: string[] }> {
    const items = await db.select().from(coachNoteItems).where(eq(coachNoteItems.noteId, note.id)).orderBy(coachNoteItems.sortOrder);
    const squadsRows = await db.select().from(coachNoteSquads).where(eq(coachNoteSquads.noteId, note.id));
    return { ...note, items, squadIds: squadsRows.map(r => r.squadId) };
  }

  async getCoachNotes(coachId: string, clubId: string): Promise<(CoachNote & { items: CoachNoteItem[]; squadIds: string[] })[]> {
    const notes = await db.select().from(coachNotes).where(and(eq(coachNotes.creatorId, coachId), eq(coachNotes.clubId, clubId)));
    return Promise.all(notes.map(n => this._enrichNote(n)));
  }

  async getCoachNote(id: string): Promise<(CoachNote & { items: CoachNoteItem[]; squadIds: string[] }) | undefined> {
    const [note] = await db.select().from(coachNotes).where(eq(coachNotes.id, id));
    if (!note) return undefined;
    return this._enrichNote(note);
  }

  async createCoachNote(
    note: InsertCoachNote,
    itemTexts: string[],
    squadIds: string[],
  ): Promise<CoachNote & { items: CoachNoteItem[]; squadIds: string[] }> {
    const [created] = await db.insert(coachNotes).values(note).returning();

    const items: CoachNoteItem[] = [];
    for (let i = 0; i < itemTexts.length; i++) {
      if (itemTexts[i].trim()) {
        const [item] = await db.insert(coachNoteItems).values({ noteId: created.id, text: itemTexts[i], sortOrder: i }).returning();
        items.push(item);
      }
    }

    for (const squadId of squadIds) {
      await db.insert(coachNoteSquads).values({ noteId: created.id, squadId }).onConflictDoNothing();
    }

    return { ...created, items, squadIds };
  }

  async updateCoachNote(
    id: string,
    note: Partial<InsertCoachNote>,
    itemTexts?: { id?: string; text: string; completed: boolean; sortOrder: number }[],
    squadIds?: string[],
  ): Promise<CoachNote & { items: CoachNoteItem[]; squadIds: string[] }> {
    const [updated] = await db
      .update(coachNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(coachNotes.id, id))
      .returning();

    if (itemTexts !== undefined) {
      await db.delete(coachNoteItems).where(eq(coachNoteItems.noteId, id));
      for (let i = 0; i < itemTexts.length; i++) {
        const item = itemTexts[i];
        if (item.text.trim()) {
          await db.insert(coachNoteItems).values({
            noteId: id,
            text: item.text,
            completed: item.completed,
            sortOrder: item.sortOrder ?? i,
          });
        }
      }
    }

    if (squadIds !== undefined) {
      await db.delete(coachNoteSquads).where(eq(coachNoteSquads.noteId, id));
      for (const squadId of squadIds) {
        await db.insert(coachNoteSquads).values({ noteId: id, squadId }).onConflictDoNothing();
      }
    }

    return this._enrichNote(updated);
  }

  async deleteCoachNote(id: string): Promise<void> {
    await db.delete(coachNotes).where(eq(coachNotes.id, id));
  }

  async updateCoachNoteItem(itemId: string, completed: boolean): Promise<CoachNoteItem> {
    const [updated] = await db
      .update(coachNoteItems)
      .set({ completed })
      .where(eq(coachNoteItems.id, itemId))
      .returning();

    // Auto-close parent note if all items are now complete
    if (completed) {
      const allItems = await db.select().from(coachNoteItems).where(eq(coachNoteItems.noteId, updated.noteId));
      const allDone = allItems.every(i => i.completed);
      if (allDone) {
        await db.update(coachNotes).set({ status: "closed", updatedAt: new Date() }).where(eq(coachNotes.id, updated.noteId));
      }
    }

    return updated;
  }

  // Pending Registration operations
  async createPendingRegistration(data: InsertPendingRegistration): Promise<PendingRegistration> {
    const [record] = await db.insert(pendingRegistrations).values(data).returning();
    return record;
  }

  async getPendingRegistrationBySessionId(stripeCheckoutSessionId: string): Promise<PendingRegistration | undefined> {
    const [record] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.stripeCheckoutSessionId, stripeCheckoutSessionId));
    return record;
  }

  async deletePendingRegistration(id: string): Promise<void> {
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, id));
  }

  // Handbook Document operations
  async getHandbookDocuments(clubId: string): Promise<HandbookDocument[]> {
    return db
      .select()
      .from(handbookDocuments)
      .where(and(eq(handbookDocuments.clubId, clubId), eq(handbookDocuments.recordStatus, "active")));
  }

  async createHandbookDocument(data: InsertHandbookDocument): Promise<HandbookDocument> {
    const [doc] = await db.insert(handbookDocuments).values(data).returning();
    return doc;
  }

  async deleteHandbookDocument(id: string): Promise<void> {
    await db
      .update(handbookDocuments)
      .set({ recordStatus: "inactive" })
      .where(eq(handbookDocuments.id, id));
  }

  // ─── Recurring Sessions ───────────────────────────────────────────────────

  private async _enrichRecurringSession(rs: RecurringSession): Promise<RecurringSession & { squadIds: string[] }> {
    const links = await db.select().from(recurringSessionSquads).where(eq(recurringSessionSquads.recurringSessionId, rs.id));
    return { ...rs, squadIds: links.map(l => l.squadId) };
  }

  async getRecurringSessions(clubId: string): Promise<(RecurringSession & { squadIds: string[] })[]> {
    const rows = await db.select().from(recurringSessions)
      .where(and(eq(recurringSessions.clubId, clubId), eq(recurringSessions.recordStatus, "active")));
    return Promise.all(rows.map(r => this._enrichRecurringSession(r)));
  }

  async createRecurringSession(data: InsertRecurringSession, squadIds: string[]): Promise<RecurringSession & { squadIds: string[] }> {
    const [rs] = await db.insert(recurringSessions).values(data).returning();
    for (const squadId of squadIds) {
      await db.insert(recurringSessionSquads).values({ recurringSessionId: rs.id, squadId }).onConflictDoNothing();
    }
    return this._enrichRecurringSession(rs);
  }

  async updateRecurringSession(id: string, clubId: string, data: Partial<InsertRecurringSession>, squadIds?: string[]): Promise<RecurringSession & { squadIds: string[] }> {
    const [rs] = await db.update(recurringSessions).set(data)
      .where(and(eq(recurringSessions.id, id), eq(recurringSessions.clubId, clubId)))
      .returning();
    if (!rs) throw new Error("Recurring session not found or access denied");
    if (squadIds !== undefined) {
      await db.delete(recurringSessionSquads).where(eq(recurringSessionSquads.recurringSessionId, id));
      for (const squadId of squadIds) {
        await db.insert(recurringSessionSquads).values({ recurringSessionId: id, squadId }).onConflictDoNothing();
      }
    }
    return this._enrichRecurringSession(rs);
  }

  async deleteRecurringSession(id: string, clubId: string): Promise<void> {
    await db.update(recurringSessions).set({ recordStatus: "inactive" })
      .where(and(eq(recurringSessions.id, id), eq(recurringSessions.clubId, clubId)));
  }

  // ─── Absence Periods ──────────────────────────────────────────────────────

  async getAbsencePeriods(clubId: string): Promise<AbsencePeriod[]> {
    return db.select().from(absencePeriods)
      .where(and(eq(absencePeriods.clubId, clubId), eq(absencePeriods.recordStatus, "active")));
  }

  async getAbsencePeriodsByCoach(coachId: string): Promise<AbsencePeriod[]> {
    return db.select().from(absencePeriods)
      .where(and(eq(absencePeriods.coachId, coachId), eq(absencePeriods.recordStatus, "active")));
  }

  async createAbsencePeriod(data: InsertAbsencePeriod): Promise<AbsencePeriod> {
    const [row] = await db.insert(absencePeriods).values(data).returning();
    return row;
  }

  async deleteAbsencePeriod(id: string, coachId: string, clubId: string): Promise<void> {
    await db.update(absencePeriods).set({ recordStatus: "inactive" })
      .where(and(eq(absencePeriods.id, id), eq(absencePeriods.coachId, coachId), eq(absencePeriods.clubId, clubId)));
  }

  // ─── Cover Opportunities ──────────────────────────────────────────────────

  async getCoverOpportunities(clubId: string): Promise<CoverOpportunity[]> {
    return db.select().from(coverOpportunities)
      .where(and(eq(coverOpportunities.clubId, clubId), eq(coverOpportunities.recordStatus, "active")));
  }

  async getCoverOpportunitiesByCoach(requesterCoachId: string): Promise<CoverOpportunity[]> {
    return db.select().from(coverOpportunities)
      .where(and(eq(coverOpportunities.requesterCoachId, requesterCoachId), eq(coverOpportunities.recordStatus, "active")));
  }

  async createCoverOpportunity(data: InsertCoverOpportunity): Promise<CoverOpportunity> {
    const [row] = await db.insert(coverOpportunities).values(data).returning();
    return row;
  }

  async updateCoverOpportunity(id: string, clubId: string, data: Partial<InsertCoverOpportunity>): Promise<CoverOpportunity> {
    const [row] = await db.update(coverOpportunities).set(data)
      .where(and(eq(coverOpportunities.id, id), eq(coverOpportunities.clubId, clubId)))
      .returning();
    if (!row) throw new Error("Cover opportunity not found or access denied");
    return row;
  }

  async deleteCoverOpportunity(id: string, requesterCoachId: string, clubId: string): Promise<void> {
    await db.update(coverOpportunities).set({ recordStatus: "inactive" })
      .where(and(eq(coverOpportunities.id, id), eq(coverOpportunities.requesterCoachId, requesterCoachId), eq(coverOpportunities.clubId, clubId)));
  }

  // ─── Float Sessions ───────────────────────────────────────────────────────

  async getFloatSessions(clubId: string): Promise<FloatSession[]> {
    return db.select().from(floatSessions)
      .where(and(eq(floatSessions.clubId, clubId), eq(floatSessions.recordStatus, "active")));
  }

  async getFloatSessionsByCoach(coachId: string): Promise<FloatSession[]> {
    return db.select().from(floatSessions)
      .where(and(eq(floatSessions.coachId, coachId), eq(floatSessions.recordStatus, "active")));
  }

  async createFloatSession(data: InsertFloatSession): Promise<FloatSession> {
    const [row] = await db.insert(floatSessions).values(data).returning();
    return row;
  }

  async deleteFloatSession(id: string, clubId: string): Promise<void> {
    await db.update(floatSessions).set({ recordStatus: "inactive" })
      .where(and(eq(floatSessions.id, id), eq(floatSessions.clubId, clubId)));
  }
}

export const storage = new DatabaseStorage();
