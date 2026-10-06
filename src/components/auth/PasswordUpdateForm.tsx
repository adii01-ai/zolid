"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PasswordUpdateForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setIsError(true);
      setMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setIsError(true);
      setMessage("Those passwords don't match yet.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (error) {
        setIsError(true);
        setMessage("We couldn't update your password. Request a fresh reset link and try again.");
        return;
      }
      setIsError(false);
      setIsComplete(true);
      setMessage("Your password has been updated. Sign in with your new password.");
    } catch {
      setIsError(true);
      setMessage("We couldn't update your password. Request a fresh reset link and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-form" aria-labelledby="password-update-heading">
      <p className="auth-eyebrow">Account recovery</p>
      <h1 id="password-update-heading" className="auth-title">Choose a new password</h1>
      <p className="auth-description">Use at least 8 characters to protect your account.</p>
      {isComplete ? (
        <>
          <p role="status" className="auth-feedback auth-feedback-success">{message}</p>
          <Link className="auth-submit auth-submit-link" href="/auth/login">Return to sign in</Link>
        </>
      ) : (
        <form className="auth-fields" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" className="auth-input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" className="auth-input" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.currentTarget.value)} />
          </div>
          {message && <p role="alert" className={`auth-feedback ${isError ? "auth-feedback-error" : "auth-feedback-success"}`}>{message}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating password..." : "Update password"}</button>
        </form>
      )}
    </section>
  );
}
