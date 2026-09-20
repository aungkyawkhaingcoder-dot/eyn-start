import { AuthCard } from "./components/AuthCard";
import { SessionPanel } from "./components/SessionPanel";
import { RequestHistory } from "./components/RequestHistory";
import { useWorkbench } from "./hooks/useWorkbench";
export default function App() {
  const workbench = useWorkbench();
  return (
    <div className="shell">
      <header>
        <a className="brand" href="/">
          a<span>Auth Studio</span>
        </a>
        <span className="pill">DEMO SHOP / DEVELOPMENT</span>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">YOUR AUTHENTICATION WORKBENCH</p>
          <h1>
            One place.
            <br />
            <em>Every sign-in flow.</em>
          </h1>
          <p>
            Register, sign in, and see your session in action.
            <br />
            လက်ရှိ API တွေကို browser ကနေ စမ်းနိုင်ပါတယ်။
          </p>
        </section>
        <div className="layout">
          <AuthCard workbench={workbench} />
          <SessionPanel workbench={workbench} />
        </div>
        <RequestHistory logs={workbench.logs} clearLogs={workbench.clearLogs} />
      </main>
      <footer>
        Auth Studio{" "}
        <span>
          Built for testing. Connected to your existing authentication API.
        </span>
      </footer>
    </div>
  );
}
