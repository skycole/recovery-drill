import { describe, expect, it } from "vitest";
import { scenarios, type Scenario } from "../data/scenarios";
import { RTO_HEADROOM, START_DELAY_MS, STEP_MS, boardAt, clockBar, delayBeforeNext, fmt, score } from "./drill";

const byId = (id: string): Scenario => {
  const sc = scenarios.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
  return sc;
};

/** A scenario that misses its RTO, to test the losing side of the score. */
const late: Scenario = {
  id: "late",
  name: "Late restore",
  short: "Late",
  tier: "Test",
  rto: 60,
  rpo: 15,
  steps: [
    { phase: "Detect", at: 0, title: "t", body: "b", primary: "down", dr: "standby", traffic: "none" },
    { phase: "Validate", at: 95, title: "t", body: "b", primary: "down", dr: "active", traffic: "dr" }
  ]
};

describe("clock label", () => {
  it.each([
    [0, "0m"],
    [12, "12m"],
    [59, "59m"],
    [60, "1h"],
    [65, "1h 05m"],
    [150, "2h 30m"],
    [240, "4h"],
    [480, "8h"]
  ])("formats %i minutes as %s", (min, label) => {
    expect(fmt(min)).toBe(label);
  });
});

describe("playback timing", () => {
  it("waits briefly before the first step, then a full step between steps", () => {
    expect(delayBeforeNext(-1)).toBe(START_DELAY_MS);
    expect(delayBeforeNext(0)).toBe(STEP_MS);
    expect(delayBeforeNext(4)).toBe(STEP_MS);
    expect(START_DELAY_MS).toBeLessThan(STEP_MS);
  });
});

describe("board state", () => {
  it("shows a healthy, replicating site before the drill starts", () => {
    expect(boardAt(byId("ransomware"), -1)).toEqual({
      primary: "up",
      dr: "standby",
      traffic: "primary",
      elapsed: 0,
      replicating: true,
      overRto: false
    });
  });

  it("follows the step's site states and clock", () => {
    const b = boardAt(byId("ransomware"), 2);
    expect(b).toMatchObject({ primary: "isolated", dr: "warming", traffic: "none", elapsed: 25 });
  });

  it("lets a step cut replication even while the primary is still up", () => {
    // Step 1 of the ransomware drill: primary degraded, replication cut so encrypted data does not follow.
    const b = boardAt(byId("ransomware"), 1);
    expect(b.primary).toBe("degraded");
    expect(b.replicating).toBe(false);
  });

  it("replicates by default only while the primary is up or degraded", () => {
    expect(boardAt(byId("patch"), 0).replicating).toBe(true); // degraded
    expect(boardAt(byId("region"), 0).replicating).toBe(false); // down
    expect(boardAt(byId("ransomware"), 3).replicating).toBe(false); // isolated
  });

  it("flags the clock once it passes the RTO", () => {
    expect(boardAt(late, 0).overRto).toBe(false);
    expect(boardAt(late, 1).overRto).toBe(true);
  });
});

describe("clock bar", () => {
  it("starts empty and puts the RTO marker at the same place for every scenario", () => {
    for (const sc of scenarios) {
      const { pct, rtoPct } = clockBar(sc, 0);
      expect(pct).toBe(0);
      expect(rtoPct).toBeCloseTo(100 / RTO_HEADROOM, 10);
    }
  });

  it("reaches the marker exactly at the RTO and never overflows", () => {
    const sc = byId("ransomware");
    expect(clockBar(sc, sc.rto).pct).toBeCloseTo(clockBar(sc, 0).rtoPct, 10);
    expect(clockBar(sc, sc.rto * 10).pct).toBe(100);
    expect(clockBar(sc, -5).pct).toBe(0);
  });
});

describe("score", () => {
  it.each([
    ["ransomware", 150, 90],
    ["region", 190, 290],
    ["patch", 210, 150]
  ])("%s: restored at T+%i, %i minutes inside the RTO", (id, restoredAt, margin) => {
    expect(score(byId(id))).toEqual({ restoredAt, rtoMet: true, marginMin: margin });
  });

  it("reports a miss with a negative margin", () => {
    expect(score(late)).toEqual({ restoredAt: 95, rtoMet: false, marginMin: -35 });
  });

  it("falls back to the last step when there is no Validate step", () => {
    const noValidate: Scenario = { ...late, steps: late.steps.map((s) => ({ ...s, phase: "Recover" })) };
    expect(score(noValidate).restoredAt).toBe(95);
  });

  it("counts an RTO hit exactly on the line as met", () => {
    const onTheLine: Scenario = { ...late, rto: 95 };
    expect(score(onTheLine)).toEqual({ restoredAt: 95, rtoMet: true, marginMin: 0 });
  });
});
