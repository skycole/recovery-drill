import { describe, expect, it } from "vitest";
import { scenarios } from "./scenarios";
import { score } from "../lib/drill";

// Guards for anyone adding a scenario: the drill only makes sense if the data follows these rules.
describe("scenario data", () => {
  it("has unique ids", () => {
    const ids = scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s starts at T+0 and moves forward in time", (_id, sc) => {
    expect(sc.steps.length).toBeGreaterThan(1);
    expect(sc.steps[0]!.at).toBe(0);
    for (let i = 1; i < sc.steps.length; i++) {
      expect(sc.steps[i]!.at).toBeGreaterThan(sc.steps[i - 1]!.at);
    }
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s has positive targets and one sign-off step", (_id, sc) => {
    expect(sc.rto).toBeGreaterThan(0);
    expect(sc.rpo).toBeGreaterThan(0);
    expect(sc.rpo).toBeLessThanOrEqual(sc.rto);
    expect(sc.steps.filter((s) => s.phase === "Validate")).toHaveLength(1);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s restores service inside its RTO", (_id, sc) => {
    expect(score(sc).rtoMet).toBe(true);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s serves users from DR only once DR is active", (_id, sc) => {
    for (const step of sc.steps) {
      if (step.traffic === "dr") expect(step.dr).toBe("active");
    }
  });
});
