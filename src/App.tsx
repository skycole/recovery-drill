import RecoveryDrill from "./components/RecoveryDrill";

export default function App() {
  return (
    <main className="min-h-screen bg-ink font-sans text-chalk antialiased">
      <RecoveryDrill />
      <footer className="wrap pb-14 text-[13px] text-mute">
        Built by Sky Coleman. The same drill runs live on{" "}
        <a className="text-carolina-300 underline-offset-4 hover:underline" href="https://www.skycole.ai/#drill">
          skycole.ai
        </a>
        .
      </footer>
    </main>
  );
}
