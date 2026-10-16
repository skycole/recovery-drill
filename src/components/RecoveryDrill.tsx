import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, CheckCircle2, AlertTriangle } from "lucide-react";
import { scenarios, type DrState, type SiteState } from "../data/scenarios";
import { boardAt, clockBar, delayBeforeNext, fmt, score } from "../lib/drill";
import Reveal from "./Reveal";

const siteTone: Record<SiteState, { stroke: string; fill: string; label: string; text: string }> = {
  up: { stroke: "#3DDC97", fill: "rgba(61,220,151,0.08)", label: "Healthy", text: "#3DDC97" },
  degraded: { stroke: "#F5B642", fill: "rgba(245,182,66,0.08)", label: "Degraded", text: "#F5B642" },
  isolated: { stroke: "#FF6B6B", fill: "rgba(255,107,107,0.07)", label: "Isolated", text: "#FF6B6B" },
  down: { stroke: "#FF6B6B", fill: "rgba(255,107,107,0.05)", label: "Down", text: "#FF6B6B" }
};

const drTone: Record<DrState, { stroke: string; fill: string; label: string; text: string }> = {
  standby: { stroke: "#4A5D78", fill: "rgba(143,163,186,0.05)", label: "Standby", text: "#8FA3BA" },
  warming: { stroke: "#F5B642", fill: "rgba(245,182,66,0.08)", label: "Warming", text: "#F5B642" },
  active: { stroke: "#3DDC97", fill: "rgba(61,220,151,0.08)", label: "Serving traffic", text: "#3DDC97" }
};

export default function RecoveryDrill() {
  const [sid, setSid] = useState(scenarios[0]!.id);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const sc = useMemo(() => scenarios.find((s) => s.id === sid) ?? scenarios[0]!, [sid]);
  const last = sc.steps.length - 1;
  const done = step === last;

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), delayBeforeNext(step));
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const pick = (id: string) => {
    setSid(id);
    setStep(-1);
    setPlaying(false);
  };
  const reset = () => {
    setStep(-1);
    setPlaying(false);
  };
  const toggle = () => {
    if (done) {
      setStep(-1);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const next = () => {
    setPlaying(false);
    setStep((s) => Math.min(s + 1, last));
  };

  const { primary, dr, traffic, elapsed, replicating, overRto } = boardAt(sc, step);
  const { pct, rtoPct } = clockBar(sc, elapsed);
  const result = score(sc);
  const pT = siteTone[primary];
  const dT = drTone[dr];

  return (
    <section id="drill" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-carolina-400/30 to-transparent" aria-hidden />
      <div className="wrap">
        <Reveal>
          <p className="eyebrow">Interactive tabletop</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <h2 className="h2 max-w-xl">Run a recovery drill.</h2>
            <p className="lede max-w-md">
              Pick an incident and watch the recovery play out against its RTO and RPO targets, the way I would walk a room
              of app owners through a tabletop. Generic scenarios, not any employer&apos;s plan.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card mt-10 overflow-hidden">
            <div role="tablist" aria-label="Scenarios" className="flex gap-1 overflow-x-auto border-b border-line p-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`drill-tab-${s.id}`}
                  aria-controls="drill-panel"
                  aria-selected={s.id === sid}
                  onClick={() => pick(s.id)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-[13px] transition ${
                    s.id === sid ? "bg-carolina-400/15 text-chalk" : "text-mute hover:bg-white/[0.03] hover:text-chalk"
                  }`}
                >
                  {s.short}
                </button>
              ))}
            </div>

            <div id="drill-panel" role="tabpanel" aria-labelledby={`drill-tab-${sid}`} className="grid lg:grid-cols-[1.25fr_1fr]">
              <div className="border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold tracking-tight">{sc.name}</p>
                    <p className="mt-0.5 text-[13px] text-mute">{sc.tier}</p>
                  </div>
                  <div className="flex gap-5 font-mono text-[12px]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-mute">RTO</p>
                      <p className="mt-0.5 text-chalk">{fmt(sc.rto)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-mute">RPO</p>
                      <p className="mt-0.5 text-chalk">{fmt(sc.rpo)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-mute">Clock</p>
                      <p
                        role="timer"
                        aria-label="Drill clock"
                        aria-live="polite"
                        className={`mt-0.5 ${overRto ? "text-bad" : "text-carolina-300"}`}
                      >
                        T+{fmt(elapsed)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="relative h-2 rounded-full bg-white/[0.05]">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${done ? "bg-ok" : "bg-carolina-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute -top-1 h-4 w-px bg-chalk/70" style={{ left: `${rtoPct}%` }} aria-hidden />
                  </div>
                  <div className="relative mt-1.5 h-4 font-mono text-[10px] text-mute">
                    <span className="absolute -translate-x-1/2" style={{ left: `${rtoPct}%` }}>
                      RTO target
                    </span>
                  </div>
                </div>

                <svg viewBox="0 0 640 250" className="mt-4 w-full" role="img" aria-label={`Primary site ${pT.label}. DR site ${dT.label}.`}>
                  <defs>
                    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="#7BAFD4" />
                    </marker>
                  </defs>

                  {/* users */}
                  <g>
                    <rect x="16" y="95" width="130" height="60" rx="12" fill="rgba(123,175,212,0.06)" stroke="rgba(153,195,227,0.25)" />
                    <text x="81" y="121" textAnchor="middle" fill="#EEF3F8" fontSize="14" fontWeight="600">Users</text>
                    <text x="81" y="140" textAnchor="middle" fill="#8FA3BA" fontSize="11" fontFamily="var(--font-mono)">
                      {traffic === "none" ? "outage" : "served"}
                    </text>
                  </g>

                  {/* links */}
                  <path
                    d="M146,115 C260,115 280,62 408,62"
                    fill="none"
                    stroke={traffic === "primary" ? "#7BAFD4" : "rgba(143,163,186,0.25)"}
                    strokeWidth={traffic === "primary" ? 2 : 1.5}
                    strokeDasharray="6 8"
                    className={traffic === "primary" ? "animate-dash" : ""}
                    markerEnd={traffic === "primary" ? "url(#arr)" : undefined}
                  />
                  <path
                    d="M146,135 C260,135 280,188 408,188"
                    fill="none"
                    stroke={traffic === "dr" ? "#3DDC97" : "rgba(143,163,186,0.25)"}
                    strokeWidth={traffic === "dr" ? 2 : 1.5}
                    strokeDasharray="6 8"
                    className={traffic === "dr" ? "animate-dash" : ""}
                  />
                  {traffic === "none" && (
                    <text x="270" y="130" textAnchor="middle" fill="#FF6B6B" fontSize="11" fontFamily="var(--font-mono)">
                      no path to service
                    </text>
                  )}

                  {/* replication */}
                  <line x1="515" y1="100" x2="515" y2="150" stroke={replicating ? "#7BAFD4" : "#FF6B6B"} strokeWidth="1.5" strokeDasharray="3 5" className={replicating ? "animate-dash" : ""} />
                  <text x="527" y="129" fill="#8FA3BA" fontSize="10" fontFamily="var(--font-mono)">
                    {replicating ? "replicating" : "cut"}
                  </text>

                  {/* primary */}
                  <g>
                    <rect x="410" y="22" width="210" height="78" rx="14" fill={pT.fill} stroke={pT.stroke} strokeWidth="1.5" strokeDasharray={primary === "isolated" ? "6 5" : undefined} style={{ transition: "all .5s" }} />
                    <text x="430" y="52" fill="#EEF3F8" fontSize="14" fontWeight="600">Primary data center</text>
                    <circle cx="436" cy="75" r="4" fill={pT.stroke} />
                    <text x="448" y="79" fill={pT.text} fontSize="11" fontFamily="var(--font-mono)">{pT.label}</text>
                  </g>

                  {/* dr */}
                  <g>
                    <rect x="410" y="150" width="210" height="78" rx="14" fill={dT.fill} stroke={dT.stroke} strokeWidth="1.5" style={{ transition: "all .5s" }} />
                    <text x="430" y="180" fill="#EEF3F8" fontSize="14" fontWeight="600">DR site</text>
                    <circle cx="436" cy="203" r="4" fill={dT.stroke} />
                    <text x="448" y="207" fill={dT.text} fontSize="11" fontFamily="var(--font-mono)">{dT.label}</text>
                  </g>
                </svg>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden" aria-hidden>
                  {[
                    ["Users", traffic === "none" ? "Outage" : "Served", traffic === "none" ? "#FF6B6B" : "#7BAFD4"],
                    ["Primary", pT.label, pT.stroke],
                    ["DR site", dT.label, dT.stroke]
                  ].map(([k, v, c]) => (
                    <div key={k} className="rounded-lg border border-line p-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-mute">{k}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: c }}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
                        {v}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={toggle} className="btn-primary px-4 py-2.5">
                    {playing ? <Pause size={15} /> : <Play size={15} />}
                    {playing ? "Pause" : done ? "Run again" : step < 0 ? "Start drill" : "Resume"}
                  </button>
                  <button type="button" onClick={next} disabled={done} className="btn-ghost px-4 py-2.5 disabled:opacity-40">
                    <SkipForward size={15} /> Step
                  </button>
                  <button type="button" onClick={reset} className="btn-ghost px-4 py-2.5">
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
              </div>

              <ol className="p-3 sm:p-4" aria-label="Recovery timeline">
                {sc.steps.map((s, i) => {
                  const state = i < step ? "past" : i === step ? "now" : "next";
                  return (
                    <li
                      key={s.phase + s.at}
                      aria-current={state === "now" ? "step" : undefined}
                      className={`rounded-xl px-4 py-3 transition ${state === "now" ? "bg-carolina-400/10" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                            state === "past"
                              ? "border-ok/50 bg-ok/10 text-ok"
                              : state === "now"
                              ? "border-carolina-400 bg-carolina-400 text-ink"
                              : "border-line text-mute"
                          }`}
                        >
                          {state === "past" ? "✓" : i + 1}
                        </span>
                        <span className={`text-[14px] ${state === "next" ? "text-mute" : "text-chalk"}`}>
                          <span className="font-mono text-[11px] uppercase tracking-wider text-carolina-300">{s.phase}</span>
                          <span className="mx-2 text-mute">·</span>
                          {s.title}
                        </span>
                        <span className="ml-auto font-mono text-[11px] text-mute">T+{fmt(s.at)}</span>
                      </div>
                      {state === "now" && <p className="mt-2 pl-9 text-[13.5px] leading-relaxed text-chalk/80">{s.body}</p>}
                    </li>
                  );
                })}
                {step < 0 && (
                  <li className="px-4 pt-3 text-[13px] text-mute">Press Start drill. You can pause or step through it.</li>
                )}
                {done && result.rtoMet && (
                  <li className="mx-1 mt-3 flex items-start gap-3 rounded-xl border border-ok/30 bg-ok/[0.06] p-4">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
                    <p className="text-[13.5px] leading-relaxed text-chalk">
                      Business signed off on restored service at T+{fmt(result.restoredAt)} against a {fmt(sc.rto)} RTO, with{" "}
                      {fmt(result.marginMin)} to spare. Data loss held inside the {fmt(sc.rpo)} RPO.
                    </p>
                  </li>
                )}
                {done && !result.rtoMet && (
                  <li className="mx-1 mt-3 flex items-start gap-3 rounded-xl border border-bad/30 bg-bad/[0.06] p-4">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad" />
                    <p className="text-[13.5px] leading-relaxed text-chalk">
                      Service came back at T+{fmt(result.restoredAt)}, {fmt(-result.marginMin)} past the {fmt(sc.rto)} RTO.
                      That gap is the first item in the lessons-learned report.
                    </p>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
