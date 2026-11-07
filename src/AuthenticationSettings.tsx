import { useState } from "react";
import "./authentication-settings.css";

type Factor = "email" | "authenticator" | "passkeys";
type Trust = "Lenient" | "Moderate" | "Strict";
const requirements: Record<Trust, number> = { Lenient: 1, Moderate: 2, Strict: 3 };
const names: Record<Factor, string> = { email: "Email verification", authenticator: "Google Authenticator", passkeys: "Passkeys" };
const factors: Factor[] = ["email", "authenticator", "passkeys"];

/** UI-only preview. Production verification must be implemented and enforced by a server. */
export default function AuthenticationSettings({ onBack }: { onBack: () => void }) {
  const [enabled, setEnabled] = useState<Factor[]>(["email"]);
  const [trust, setTrust] = useState<Trust>("Lenient");
  const [passkeys, setPasskeys] = useState<string[]>([]);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [verified, setVerified] = useState<Factor[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setup, setSetup] = useState(false);
  const [setupKey, setSetupKey] = useState("");

  const requestChange = (action: () => void) => {
    setError(""); setNotice(""); setCode(""); setVerified([]);
    setPending(() => action);
  };
  const completeChange = (next: Factor[]) => {
    if (next.length < requirements[trust]) {
      setError(`Lower your trust level before removing this factor.`);
      return;
    }
    setEnabled(next);
  };
  const toggle = (factor: Factor) => {
    if (enabled.includes(factor)) {
      if (enabled.length - 1 < requirements[trust]) {
        setError("Lower your trust level before removing this factor."); return;
      }
      requestChange(() => completeChange(enabled.filter((f) => f !== factor)));
    } else if (factor === "authenticator") {
      requestChange(() => {
        const bytes = crypto.getRandomValues(new Uint8Array(20));
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = 0, value = 0, key = "";
        for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { key += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
        setSetupKey(key); setSetup(true);
      });
    } else if (factor === "passkeys") {
      requestChange(() => setNotice("Passkey registration requires a connected authentication server. No passkey was registered."));
    } else {
      requestChange(() => setNotice("Email enrollment requires server-issued verification codes. No factor was enabled."));
    }
  };
  const verify = () => {
    // Never accept an arbitrary client-entered code as proof of identity.
    setError("Verification requires a connected authentication server. No settings have been changed.");
  };
  const nextVerification = (factor: Factor) => {
    if (factor === "passkeys") {
      setError("Passkey verification requires a connected authentication server."); return;
    }
    setCode("");
    setError(`${names[factor]} verification must be validated by the authentication server.`);
  };
  const changeTrust = (level: Trust) => {
    if (enabled.length < requirements[level]) return;
    requestChange(() => setTrust(level));
  };

  return <main className="auth-settings">
    <section className="auth-settings-card">
      <button className="auth-back" onClick={onBack} type="button">← Back to profile</button>
      <h1>Authentication settings</h1>
      <p>Configure authentication methods and verification requirements for sensitive account actions.</p>
      <p className="auth-warning" role="status">Preview only: authentication verification and enrollment require a backend. This page does not grant or change real security credentials.</p>
      <h2>Authentication methods</h2>
      {factors.map(factor => <div className="auth-factor" key={factor}>
        <div><strong>{names[factor]}</strong><small>{factor === "passkeys" ? `${passkeys.length} registered · collectively one factor` : enabled.includes(factor) ? "Active" : "Not configured"}</small></div>
        <button type="button" onClick={() => toggle(factor)}>{enabled.includes(factor) ? "Remove" : "Configure"}</button>
      </div>)}
      <h2>Trust level</h2>
      <div className="auth-levels">{(["Lenient", "Moderate", "Strict"] as Trust[]).map(level => <button key={level} type="button" disabled={enabled.length < requirements[level]} aria-pressed={trust === level} onClick={() => changeTrust(level)}><strong>{level}</strong><small>{requirements[level]} {requirements[level] === 1 ? "factor" : "factors"} required</small></button>)}</div>
      <p>Current trust level: <strong>{trust}</strong>. Configured factors: {enabled.length} of 3.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="auth-warning" role="status">{notice}</p>}
      {pending && <div className="auth-modal-backdrop"><section className="auth-modal" role="dialog" aria-modal="true" aria-label="Verify current trust level"><h2>Verify your identity</h2><p>Your current {trust} trust level requires {requirements[trust]} distinct authentication {requirements[trust] === 1 ? "factor" : "factors"}. Choose which configured factors to use.</p>
        <p>Verified: {verified.length} / {requirements[trust]}</p>
        {enabled.filter(f => !verified.includes(f)).map(f => <button key={f} type="button" onClick={() => nextVerification(f)}>{names[f]}</button>)}
        <label htmlFor="auth-code">Verification code</label><input id="auth-code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter verification code" />
        <button type="button" onClick={verify}>Verify code</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="button" onClick={() => { setPending(null); setError(""); }}>Cancel</button>
      </section></div>}
      {setup && <div className="auth-modal-backdrop"><section className="auth-modal" role="dialog" aria-modal="true" aria-label="Authenticator setup"><h2>Google Authenticator setup</h2><p>Enrollment cannot be completed without server verification. Do not use this preview key for a real account.</p><code>{setupKey}</code><p>A server-generated QR code and verified one-time code are required before activation.</p><button type="button" onClick={() => setSetup(false)}>Close</button></section></div>}
    </section>
  </main>;
}
