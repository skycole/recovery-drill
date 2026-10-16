// Recovery drill scenarios. Generic, public-knowledge DR practice, nothing employer-specific.
export type SiteState = "up" | "degraded" | "isolated" | "down";
export type DrState = "standby" | "warming" | "active";
export type Traffic = "primary" | "none" | "dr";

export type DrillStep = {
  phase: string;
  at: number; // minutes from incident start
  title: string;
  body: string;
  primary: SiteState;
  dr: DrState;
  traffic: Traffic;
  replication?: "on" | "cut"; // overrides the default (on while primary is up or degraded)
};

export type Scenario = {
  id: string;
  name: string;
  short: string;
  tier: string;
  rto: number; // minutes
  rpo: number; // minutes
  steps: DrillStep[];
};

export const scenarios: Scenario[] = [
  {
    id: "ransomware",
    name: "Ransomware in the primary data center",
    short: "Ransomware",
    tier: "Tier 1 order platform",
    rto: 240,
    rpo: 15,
    steps: [
      { phase: "Detect", at: 0, title: "EDR and SIEM alerts fire", body: "Mass file renames on two app servers. Correlate the alerts, confirm it is real, open the incident bridge.", primary: "degraded", dr: "standby", traffic: "primary" },
      { phase: "Declare", at: 12, title: "Disaster declared", body: "The incident commander declares. Replication to DR is suspended so encrypted data does not follow. Leadership, legal, and business owners get notified through the pre-approved comms tree.", primary: "degraded", dr: "standby", traffic: "primary", replication: "cut" },
      { phase: "Contain", at: 25, title: "Isolate the blast radius", body: "Segment the affected VLANs, disable compromised accounts, and preserve forensic artifacts before anything is wiped.", primary: "isolated", dr: "warming", traffic: "none" },
      { phase: "Recover", at: 70, title: "Recover from clean backups", body: "Replicas may carry the encryption, so the DR site is rebuilt from the last known-clean restore point in immutable backups, scanned before it goes live.", primary: "isolated", dr: "warming", traffic: "none" },
      { phase: "Validate", at: 150, title: "Business sign-off and cutover", body: "App owners run the validation scripts from the BCP. Data loss is measured from the last clean restore point, confirmed inside the 15 minute RPO, and anything after it is re-keyed from source records.", primary: "isolated", dr: "active", traffic: "dr" },
      { phase: "Learn", at: 205, title: "Restored inside RTO", body: "Rebuild primary from gold images, schedule failback, and write the lessons-learned report while it is fresh.", primary: "down", dr: "active", traffic: "dr" }
    ]
  },
  {
    id: "region",
    name: "Cloud region outage",
    short: "Region outage",
    tier: "Tier 2 customer portal",
    rto: 480,
    rpo: 60,
    steps: [
      { phase: "Detect", at: 0, title: "Health checks go red", body: "Synthetic monitors fail from three locations. The provider's status page confirms a regional event.", primary: "down", dr: "standby", traffic: "none" },
      { phase: "Declare", at: 20, title: "Invoke the regional runbook", body: "No point waiting on the provider's ETA while the RTO clock runs. Declare and start failover.", primary: "down", dr: "warming", traffic: "none" },
      { phase: "Recover", at: 60, title: "Stand up the secondary region", body: "Infrastructure as code scales the warm standby to full capacity. The cross-region database replica is promoted to primary.", primary: "down", dr: "warming", traffic: "none" },
      { phase: "Cutover", at: 140, title: "Move DNS and traffic", body: "DNS TTLs were lowered ahead of time, so the cutover lands in minutes instead of hours.", primary: "down", dr: "active", traffic: "dr" },
      { phase: "Validate", at: 190, title: "Smoke tests and sign-off", body: "Log in, submit, pay, and report paths all pass. Customer comms confirm service is back.", primary: "down", dr: "active", traffic: "dr" },
      { phase: "Learn", at: 260, title: "Restored with room to spare", body: "Document the gaps, then plan a quiet failback once the provider publishes its root cause.", primary: "up", dr: "active", traffic: "dr" }
    ]
  },
  {
    id: "patch",
    name: "Bad patch pushed to the server fleet",
    short: "Bad patch",
    tier: "Tier 2 internal apps",
    rto: 360,
    rpo: 240,
    steps: [
      { phase: "Detect", at: 0, title: "Reboot-loop reports spike", body: "Endpoint telemetry shows servers failing to come back after the patch window.", primary: "degraded", dr: "standby", traffic: "primary" },
      { phase: "Contain", at: 10, title: "Halt the deployment", body: "Pause the remaining rings so the problem stops at the pilot and first production wave.", primary: "degraded", dr: "standby", traffic: "primary" },
      { phase: "Declare", at: 30, title: "Scope and declare", body: "Query the fleet: which builds, which apps, which business functions. Declare for the apps that cannot wait out the fix, prioritized by BIA tier.", primary: "degraded", dr: "warming", traffic: "primary" },
      { phase: "Recover", at: 90, title: "Roll back and restore", body: "Fail the declared apps over to DR so users keep working, then uninstall the patch where possible and restore from pre-patch snapshots where not, highest tier first.", primary: "degraded", dr: "active", traffic: "dr" },
      { phase: "Validate", at: 210, title: "Confirm app health", body: "Owners confirm each restored app. Compliance reporting picks up the corrected baseline.", primary: "up", dr: "standby", traffic: "primary" },
      { phase: "Learn", at: 250, title: "Fix the process, not just the servers", body: "Add a longer soak in the pilot ring and an automatic halt on failed-reboot thresholds.", primary: "up", dr: "standby", traffic: "primary" }
    ]
  }
];
