"use client";

import { useActionState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action} className="cms-login-form">
      <label htmlFor="email">Work email</label>
      <input
        autoComplete="username"
        autoFocus
        id="email"
        name="email"
        placeholder="you@publication.com"
        required
        type="email"
      />
      <label htmlFor="password">Password</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />
      {state?.error && <p className="cms-form-error" role="alert">{state.error}</p>}
      <button className="cms-primary-button" disabled={pending} type="submit">
        {pending ? <LoaderCircle aria-hidden="true" className="cms-spin" size={17} /> : <LockKeyhole aria-hidden="true" size={16} />}
        Sign in securely
      </button>
      <p className="cms-login-note">Access is invite-only. Public registration is disabled.</p>
    </form>
  );
}
