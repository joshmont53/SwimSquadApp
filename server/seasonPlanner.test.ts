import assert from "node:assert/strict";
import test from "node:test";
import type { Competition } from "@shared/schema";
import { generateSeasonPlanEntries, validateSeasonPlanEntries } from "./seasonPlanner";

const competition = (overrides: Partial<Competition> = {}): Competition => ({
  id: "competition-1",
  clubId: "club-1",
  competitionName: "County Championships",
  locationId: "location-1",
  startDate: "2026-09-07",
  endDate: "2026-09-07",
  color: "#3b82f6",
  recordStatus: "active",
  createdAt: new Date(),
  ...overrides,
});

test("uses ISO weekdays and creates only matching Standard Schedule slots", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2026-09-07", endDate: "2026-09-13" },
    ["squad-1"],
    [{
      id: "recurring-1",
      dayOfWeek: 1,
      startTime: "18:00:00",
      endTime: "20:00:00",
      locationId: "location-1",
      squadIds: ["squad-1"],
    }],
    [],
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, "2026-09-07");
  assert.equal(entries[0].trainingWeek, 1);
  assert.equal(entries[0].trainingPhase, "");
  assert.equal(entries[0].intensity, "");
});

test("deduplicates joint slots and retains all selected squad IDs", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2026-09-07", endDate: "2026-09-07" },
    ["squad-1", "squad-2"],
    [
      {
        id: "recurring-1",
        dayOfWeek: 1,
        startTime: "18:00:00",
        endTime: "20:00:00",
        locationId: "location-1",
        squadIds: ["squad-1"],
      },
      {
        id: "recurring-2",
        dayOfWeek: 1,
        startTime: "18:00:00",
        endTime: "20:00:00",
        locationId: "location-1",
        squadIds: ["squad-2"],
      },
    ],
    [],
  );
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].squadIds.sort(), ["squad-1", "squad-2"]);
});

test("annotates training rows for competitions rather than creating competition rows", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2026-09-07", endDate: "2026-09-07" },
    ["squad-1"],
    [{
      id: "recurring-1",
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "20:00",
      locationId: "location-1",
      squadIds: ["squad-1"],
    }],
    [competition()],
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "session");
  assert.equal(entries[0].competitionEvent, "County Championships");
});

test("marks scheduled holiday sessions using the England baseline", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2026-10-26", endDate: "2026-10-26" },
    ["squad-1"],
    [{
      id: "recurring-1",
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "20:00",
      locationId: "location-1",
      squadIds: ["squad-1"],
    }],
    [],
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].isInHoliday, true);
  assert.match(entries[0].holidayName || "", /October half term/);
});

test("keeps a holiday marker when there is no training session", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2027-02-15", endDate: "2027-02-15" },
    ["squad-1"],
    [],
    [],
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "holiday");
  assert.equal(entries[0].startTime, null);
  assert.equal(entries[0].trainingPhase, "");
  assert.equal(entries[0].intensity, "");
});

test("rejects entry squads and dates outside the persisted plan boundaries", () => {
  const entries = generateSeasonPlanEntries(
    { startDate: "2026-09-07", endDate: "2026-09-07" },
    ["squad-1"],
    [{
      id: "recurring-1",
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "20:00",
      locationId: "location-1",
      squadIds: ["squad-1"],
    }],
    [],
  );
  assert.equal(validateSeasonPlanEntries(entries, ["squad-1"], "2026-09-07", "2026-09-07"), null);
  assert.match(
    validateSeasonPlanEntries([{ ...entries[0], squadIds: ["other-squad"] }], ["squad-1"], "2026-09-07", "2026-09-07") || "",
    /linked to this plan/,
  );
  assert.match(
    validateSeasonPlanEntries([{ ...entries[0], date: "2026-09-08" }], ["squad-1"], "2026-09-07", "2026-09-07") || "",
    /date range/,
  );
});