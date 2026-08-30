import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import { inArray } from "drizzle-orm";
import {
  attendance,
  clubs,
  coaches,
  locations,
  sessionFeedback,
  sessionSquads,
  squads,
  swimmingSessions,
  swimmers,
  users,
} from "@shared/schema";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

test("authenticated session reads never return another club's data", async () => {
  const suffix = randomUUID();
  const clubIds = [`session-squad-club-a-${suffix}`, `session-squad-club-b-${suffix}`];
  const userId = `session-squad-user-a-${suffix}`;
  const coachIds = [`session-squad-coach-a-${suffix}`, `session-squad-coach-b-${suffix}`];
  const locationIds = [`session-squad-location-a-${suffix}`, `session-squad-location-b-${suffix}`];
  const squadIds = [`session-squad-squad-a-${suffix}`, `session-squad-squad-b-${suffix}`];
  const swimmerIds = [`session-squad-swimmer-a-${suffix}`, `session-squad-swimmer-b-${suffix}`];
  const sessionIds = [`session-squad-session-a-${suffix}`, `session-squad-session-b-${suffix}`];
  const linkIds = [`session-squad-link-a-${suffix}`, `session-squad-link-b-${suffix}`];
  const attendanceIds = [`session-squad-attendance-a-${suffix}`, `session-squad-attendance-b-${suffix}`];
  const feedbackIds = [`session-squad-feedback-a-${suffix}`, `session-squad-feedback-b-${suffix}`];
  let server: Awaited<ReturnType<typeof registerRoutes>> | undefined;

  try {
    await db.insert(clubs).values([
      { id: clubIds[0], clubName: "Session Squad Test Club A" },
      { id: clubIds[1], clubName: "Session Squad Test Club B" },
    ]);
    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.test`,
      isEmailVerified: true,
      accountStatus: "active",
      role: "admin",
    });
    await db.insert(coaches).values([
      {
        id: coachIds[0],
        userId,
        clubId: clubIds[0],
        firstName: "Test",
        lastName: "Coach A",
        level: "Level 1",
      },
      {
        id: coachIds[1],
        clubId: clubIds[1],
        firstName: "Test",
        lastName: "Coach B",
        level: "Level 1",
      },
    ]);
    await db.insert(locations).values([
      { id: locationIds[0], clubId: clubIds[0], poolName: "Test Pool A", poolType: "SC" },
      { id: locationIds[1], clubId: clubIds[1], poolName: "Test Pool B", poolType: "SC" },
    ]);
    await db.insert(squads).values([
      { id: squadIds[0], clubId: clubIds[0], squadName: "Test Squad A" },
      { id: squadIds[1], clubId: clubIds[1], squadName: "Test Squad B" },
    ]);
    await db.insert(swimmers).values([
      {
        id: swimmerIds[0],
        clubId: clubIds[0],
        firstName: "Test",
        lastName: "Swimmer A",
        dob: "2010-01-01",
        squadId: squadIds[0],
        asaNumber: 100001,
        gender: "female",
      },
      {
        id: swimmerIds[1],
        clubId: clubIds[1],
        firstName: "Test",
        lastName: "Swimmer B",
        dob: "2010-01-01",
        squadId: squadIds[1],
        asaNumber: 100002,
        gender: "male",
      },
    ]);
    await db.insert(swimmingSessions).values([
      {
        id: sessionIds[0],
        clubId: clubIds[0],
        sessionDate: "2099-01-01",
        startTime: "18:00",
        endTime: "19:00",
        duration: "1.00",
        poolId: locationIds[0],
        squadId: squadIds[0],
        leadCoachId: coachIds[0],
        setWriterId: coachIds[0],
        focus: "Technique",
      },
      {
        id: sessionIds[1],
        clubId: clubIds[1],
        sessionDate: "2099-01-01",
        startTime: "18:00",
        endTime: "19:00",
        duration: "1.00",
        poolId: locationIds[1],
        squadId: squadIds[1],
        leadCoachId: coachIds[1],
        setWriterId: coachIds[1],
        focus: "Technique",
      },
    ]);
    await db.insert(sessionSquads).values([
      { id: linkIds[0], sessionId: sessionIds[0], squadId: squadIds[0] },
      { id: linkIds[1], sessionId: sessionIds[1], squadId: squadIds[1] },
    ]);
    await db.insert(attendance).values([
      {
        id: attendanceIds[0],
        sessionId: sessionIds[0],
        swimmerId: swimmerIds[0],
        status: "Present",
      },
      {
        id: attendanceIds[1],
        sessionId: sessionIds[1],
        swimmerId: swimmerIds[1],
        status: "Present",
      },
    ]);
    await db.insert(sessionFeedback).values([
      {
        id: feedbackIds[0],
        clubId: clubIds[0],
        sessionId: sessionIds[0],
        coachId: coachIds[0],
        engagement: 8,
        effortAndIntent: 8,
        enjoyment: 8,
        sessionClarity: 8,
        appropriatenessOfChallenge: 8,
        sessionFlow: 8,
      },
      {
        id: feedbackIds[1],
        clubId: clubIds[1],
        sessionId: sessionIds[1],
        coachId: coachIds[1],
        engagement: 9,
        effortAndIntent: 9,
        enjoyment: 9,
        sessionClarity: 9,
        appropriatenessOfChallenge: 9,
        sessionFlow: 9,
      },
    ]);

    const clubLinks = await storage.getAllSessionSquads(clubIds[0]);
    assert.deepEqual(clubLinks.map((link) => link.id), [linkIds[0]]);

    const ownSessionLinks = await storage.getSessionSquads(sessionIds[0], clubIds[0]);
    assert.deepEqual(ownSessionLinks.map((link) => link.id), [linkIds[0]]);

    const otherClubSession = await storage.getSessionForClub(sessionIds[1], clubIds[0]);
    assert.equal(otherClubSession, undefined);

    const otherClubLinks = await storage.getSessionSquads(sessionIds[1], clubIds[0]);
    assert.deepEqual(otherClubLinks, []);

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).session = { userId };
      next();
    });
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const api = (path: string, init?: RequestInit) =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });

    const ownSession = await api(`/api/sessions/${sessionIds[0]}`);
    assert.equal(ownSession.status, 200);
    const ownSessionBody = await ownSession.json() as { id: string; attendance: Array<{ id: string }> };
    assert.equal(ownSessionBody.id, sessionIds[0]);
    assert.deepEqual(ownSessionBody.attendance.map((record) => record.id), [attendanceIds[0]]);

    const ownAttendance = await api(`/api/attendance/${sessionIds[0]}`);
    assert.equal(ownAttendance.status, 200);
    const ownAttendanceBody = await ownAttendance.json() as Array<{ id: string }>;
    assert.deepEqual(ownAttendanceBody.map((record) => record.id), [attendanceIds[0]]);

    const ownAiContext = await api(`/api/sessions/${sessionIds[0]}/ai-context`);
    assert.equal(ownAiContext.status, 200);
    const ownAiContextBody = await ownAiContext.json() as { currentSession: { id: string } };
    assert.equal(ownAiContextBody.currentSession.id, sessionIds[0]);

    const crossClubResponses = await Promise.all([
      api(`/api/sessions/${sessionIds[1]}`),
      api(`/api/attendance/${sessionIds[1]}`),
      api(`/api/sessions/${sessionIds[1]}/ai-context`),
      api(`/api/sessions/${sessionIds[1]}/ai-chat`, {
        method: "POST",
        body: JSON.stringify({ message: "Summarise this session" }),
      }),
      api(`/api/feedback/session/${sessionIds[1]}`),
    ]);
    assert.deepEqual(crossClubResponses.map((response) => response.status), [404, 404, 404, 404, 404]);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    await db.delete(sessionFeedback).where(inArray(sessionFeedback.id, feedbackIds));
    await db.delete(attendance).where(inArray(attendance.id, attendanceIds));
    await db.delete(sessionSquads).where(inArray(sessionSquads.sessionId, sessionIds));
    await db.delete(swimmingSessions).where(inArray(swimmingSessions.id, sessionIds));
    await db.delete(swimmers).where(inArray(swimmers.id, swimmerIds));
    await db.delete(squads).where(inArray(squads.id, squadIds));
    await db.delete(locations).where(inArray(locations.id, locationIds));
    await db.delete(coaches).where(inArray(coaches.id, coachIds));
    await db.delete(users).where(inArray(users.id, [userId]));
    await db.delete(clubs).where(inArray(clubs.id, clubIds));
    await pool.end();
  }
});
