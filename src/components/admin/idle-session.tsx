"use client";

import { useEffect, useRef, useState } from "react";
import { checkAdminSession, keepAdminSessionAlive } from "@/app/actions/admin-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export const idleWarningMs = 2 * 60 * 1000;

export function IdleSession({ initialDeadline }: { initialDeadline: number }) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const lastRenewal = useRef(0);
  const expiring = useRef(false);
  const checking = useRef(false);
  const lastCheck = useRef(0);

  async function expire() {
    if (expiring.current) return;
    expiring.current = true;
    if (!window.dispatchEvent(new Event("cms-session-expiring", { cancelable: true }))) {
      setError("Session expired, but this tab could not preserve your review. Copy your writing before reloading or signing in again. Server access remains blocked.");
      return;
    }
    try {
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      if (signOutError) throw new Error(signOutError.message);
      window.location.replace("/admin/login");
    } catch (cause) {
      setError(`Session expired. Sign-out could not complete: ${cause instanceof Error ? cause.message : "Please retry."}`);
      expiring.current = false;
    }
  }

  async function renew() {
    if (pending.current || expiring.current) return;
    pending.current = true;
    lastRenewal.current = Date.now();
    try {
      const result = await keepAdminSessionAlive();
      if (result.deadline === null) { await expire(); return; }
      setDeadline(result.deadline);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not renew session. Save your work and retry.");
    } finally {
      pending.current = false;
    }
  }

  const renewRef = useRef(renew);
  const expireRef = useRef(expire);
  async function checkExpiry() {
    if (checking.current || expiring.current || Date.now() - lastCheck.current < 30_000) return;
    checking.current = true;
    lastCheck.current = Date.now();
    try {
      const result = await checkAdminSession();
      if (result.deadline === null) await expireRef.current();
      else setDeadline(result.deadline);
    } catch (cause) {
      setError(`Could not check session: ${cause instanceof Error ? cause.message : "Network error. Retry sign out or sign in again."}`);
    } finally { checking.current = false; }
  }
  const checkRef = useRef(checkExpiry);
  useEffect(() => { renewRef.current = renew; expireRef.current = expire; checkRef.current = checkExpiry; });

  useEffect(() => {
    const activity = (event: Event) => {
      if (!event.isTrusted || Date.now() - lastRenewal.current < 60_000) return;
      void renewRef.current();
    };
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) void checkRef.current();
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    for (const name of ["keydown", "pointerdown", "scroll", "input"]) window.addEventListener(name, activity, true);
    return () => {
      window.clearInterval(interval);
      for (const name of ["keydown", "pointerdown", "scroll", "input"]) window.removeEventListener(name, activity, true);
    };
  }, [deadline]);

  return <>
    {remaining !== null && remaining <= idleWarningMs && <section className="cms-idle-warning" role="alert" aria-label="Session timeout warning">
      <p>{remaining > 0 ? `You will be signed out in ${Math.max(1, Math.ceil(remaining / 1000))} seconds due to inactivity.` : "Your session has expired."} Unsaved review edits will be kept in this tab for recovery.</p>
      <button className="cms-primary-button" type="button" onClick={() => void renew()}>Stay signed in</button>
      {remaining <= 0 && <button className="cms-secondary-button" type="button" onClick={() => void expire()}>Retry sign out</button>}
    </section>}
    {error && <p className="cms-idle-warning" role="alert">{error}</p>}
  </>;
}
