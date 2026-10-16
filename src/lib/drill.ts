// Pure drill logic: the clock, the board state at each step, and the RTO score.
// The component only renders what these functions return, so all of it is unit tested.
import type { DrState, Scenario, SiteState, Traffic } from "../data/scenarios";

/** How long each step stays on screen while the drill plays. */
export const STEP_MS = 2800;
/** Short pause between pressing Start and the first step. */
export const START_DELAY_MS = 350;
/** The clock bar runs 15% past the RTO, so a step that lands late is visibly past the line. */
export const RTO_HEADROOM = 1.15;

/** Minutes as a clock label: 0m, 45m, 1h, 2h 30m, 1h 05m. */
export function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m.toString().padStart(2, "0")}m` : `${h}h`;
}

/** Wait before showing the next step. `step` is -1 before the drill starts. */
export function delayBeforeNext(step: number): number {
  return step < 0 ? START_DELAY_MS : STEP_MS;
}

export interface Board {
  primary: SiteState;
  dr: DrState;
  traffic: Traffic;
  /** Minutes since the incident started (T+). */
  elapsed: number;
  replicating: boolean;
  overRto: boolean;
}

/** What the diagram shows at `step` (-1 = before the drill starts: everything healthy). */
export function boardAt(sc: Scenario, step: number): Board {
  const cur = step >= 0 ? sc.steps[step] : undefined;
  const primary: SiteState = cur ? cur.primary : "up";
  const elapsed = cur ? cur.at : 0;
  // A step can force replication on or off; otherwise it runs while the primary is still serving data.
  const replicating = cur?.replication ? cur.replication === "on" : primary === "up" || primary === "degraded";
  return {
    primary,
    dr: cur ? cur.dr : "standby",
    traffic: cur ? cur.traffic : "primary",
    elapsed,
    replicating,
    overRto: elapsed > sc.rto
  };
}

/** Clock bar fill and RTO marker position, both as a percent of the bar. */
export function clockBar(sc: Scenario, elapsed: number): { pct: number; rtoPct: number } {
  const scale = sc.rto * RTO_HEADROOM;
  return {
    pct: Math.min(100, Math.max(0, (elapsed / scale) * 100)),
    rtoPct: (sc.rto / scale) * 100
  };
}

export interface Score {
  /** Minutes until the business signed off on restored service. */
  restoredAt: number;
  rtoMet: boolean;
  /** Minutes to spare against the RTO. Negative when the RTO was missed. */
  marginMin: number;
}

/** Service counts as restored at the Validate step (sign-off), or at the last step if there is none. */
export function score(sc: Scenario): Score {
  const last = sc.steps[sc.steps.length - 1];
  const validate = sc.steps.find((s) => s.phase === "Validate") ?? last;
  const restoredAt = validate ? validate.at : 0;
  return { restoredAt, rtoMet: restoredAt <= sc.rto, marginMin: sc.rto - restoredAt };
}
