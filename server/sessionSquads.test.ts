import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import {
  clubs,
  coaches,
  locations,
  sessionSquads,
  squads,
  swimmingSessions,
} from "@shared/schema";
import { db, pool } from "./db";
import { storage } from "./storage";

test("session-squad reads never return another club's relationship rows", async () => {
  const suffix = randomUUID();
  const clubIds = [`session-squad-club-a-${suffix}`, `session-squad-club-b-${suffix}`];
  const coachIds = [`session-squad-coach-a-${suffix}`, `session-squad-coach-b-${suffix}`];
  const locationIds = [`session-squad-location-a-${suffix}`, `session-squad-location-b-${suffix}`];
  const squadIds = [`session-squad-squad-a-${suffix}`, `session-squad-squad-b-${suffix}`];
  const sessionIds = [`session-squad-session-a-${suffix}`, `session-squad-session-b-${suffix}`];
  const linkIds = [`session-squad-link-a-${suffix}`, `session-squad-link-b-${suffix}`];

  try {
    await db.insert(clubs).values([
      { id: clubIds[0], clubName: "Session Squad Test Club A" },
      { id: clubIds[1], clubName: "Session Squad Test Club B" },
    ]);
    await db.insert(coaches).values([
      {
        id: coachIds[0],
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

    const clubLinks = await storage.getAllSessionSquads(clubIds[0]);
    assert.deepEqual(clubLinks.map((link) => link.id), [linkIds[0]]);

    const ownSessionLinks = await storage.getSessionSquads(sessionIds[0], clubIds[0]);
    assert.deepEqual(ownSessionLinks.map((link) => link.id), [linkIds[0]]);

    const otherClubSession = await storage.getSessionForClub(sessionIds[1], clubIds[0]);
    assert.equal(otherClubSession, undefined);

    const otherClubLinks = await storage.getSessionSquads(sessionIds[1], clubIds[0]);
    assert.deepEqual(otherClubLinks, []);
  } finally {
    await db.delete(sessionSquads).where(inArray(sessionSquads.sessionId, sessionIds));
    await db.delete(swimmingSessions).where(inArray(swimmingSessions.id, sessionIds));
    await db.delete(squads).where(inArray(squads.id, squadIds));
    await db.delete(locations).where(inArray(locations.id, locationIds));
    await db.delete(coaches).where(inArray(coaches.id, coachIds));
    await db.delete(clubs).where(inArray(clubs.id, clubIds));
    await pool.end();
  }
});
