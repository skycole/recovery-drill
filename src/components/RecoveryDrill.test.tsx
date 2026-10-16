import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecoveryDrill from "./RecoveryDrill";
import { START_DELAY_MS, STEP_MS } from "../lib/drill";

const clock = () => screen.getByRole("timer", { name: "Drill clock" });
/** Each step schedules the next timer after it renders, so time moves one timer at a time. */
const advance = (ms: number, times = 1) => {
  for (let i = 0; i < times; i++) act(() => void vi.advanceTimersByTime(ms));
};

describe("RecoveryDrill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts at T+0 on the first scenario", () => {
    render(<RecoveryDrill />);
    expect(clock().textContent).toBe("T+0m");
    expect(screen.getByRole("tab", { name: "Ransomware" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: /Start drill/ })).toBeTruthy();
  });

  it("runs the clock step by step and ends on the RTO verdict", () => {
    render(<RecoveryDrill />);
    fireEvent.click(screen.getByRole("button", { name: /Start drill/ }));

    advance(START_DELAY_MS);
    expect(clock().textContent).toBe("T+0m");
    expect(screen.getByText(/Mass file renames/)).toBeTruthy();

    advance(STEP_MS);
    expect(clock().textContent).toBe("T+12m");

    advance(STEP_MS, 4);
    expect(clock().textContent).toBe("T+3h 25m");
    expect(screen.getByText(/with 1h 30m to spare/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Run again/ })).toBeTruthy();
  });

  it("pauses the clock", () => {
    render(<RecoveryDrill />);
    fireEvent.click(screen.getByRole("button", { name: /Start drill/ }));
    advance(START_DELAY_MS);
    advance(STEP_MS);
    expect(clock().textContent).toBe("T+12m");

    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));
    advance(STEP_MS, 3);
    expect(clock().textContent).toBe("T+12m");
    expect(screen.getByRole("button", { name: /Resume/ })).toBeTruthy();
  });

  it("steps manually and resets", () => {
    render(<RecoveryDrill />);
    const step = screen.getByRole("button", { name: /Step/ });
    fireEvent.click(step);
    fireEvent.click(step);
    fireEvent.click(step);
    expect(clock().textContent).toBe("T+25m");

    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(clock().textContent).toBe("T+0m");
  });

  it("switching scenario stops the drill and shows the new targets", () => {
    render(<RecoveryDrill />);
    fireEvent.click(screen.getByRole("button", { name: /Start drill/ }));
    advance(START_DELAY_MS);
    advance(STEP_MS);
    expect(clock().textContent).toBe("T+12m");

    fireEvent.click(screen.getByRole("tab", { name: "Region outage" }));
    expect(clock().textContent).toBe("T+0m");
    expect(screen.getByText("Cloud region outage")).toBeTruthy();
    expect(screen.getByText("8h")).toBeTruthy();
    advance(STEP_MS, 3);
    expect(clock().textContent).toBe("T+0m");
  });
});
