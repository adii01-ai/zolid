"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VerificationType = "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change";

export default function ConfirmEmail({
  tokenHash,
  type,
  nextPath,
  flow,
}: {
  tokenHash: string;
  type: VerificationType | null;
  nextPath: string;
  flow: "login" | "signup" | "recovery" | null;
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecovery = type === "recovery" || flow === "recovery";
  const isLoginLink = flow === "login";

  async function verify() {
    if (!type || !tokenHash || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      const { error: verificationError } = await createSupabaseBrowserClient().auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (verificationError) {
        setError("This link is invalid or expired. Request a fresh email and open the newest link.");
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setError("We couldn’t verify this link. Request a fresh email and try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="auth-confirm-screen">
      <section className="auth-confirm-panel" aria-labelledby="confirm-heading">
        <span className="auth-brand-mark" aria-hidden="true">Z</span>
        <p className="auth-eyebrow">{isRecovery ? "Account recovery" : isLoginLink ? "Passwordless sign in" : "Email confirmation"}</p>
        <h1 id="confirm-heading" className="auth-title">
          {isRecovery ? "Confirm your password reset" : isLoginLink ? "Sign in to Zolid" : "Confirm your email"}
        </h1>
        <p className="auth-description">
          {isRecovery
            ? "Confirm this request to continue and choose a new password."
            : isLoginLink
              ? "Use this one-time link to sign in to your account."
              : "Confirm your email address to finish setting up your Zolid account."}
        </p>
        {!type || !tokenHash ? (
          <p role="alert" className="auth-feedback auth-feedback-error">
            This confirmation link is incomplete. Return to sign in and request a fresh email.
          </p>
        ) : (
          <button className="auth-submit" type="button" disabled={isVerifying} onClick={() => void verify()}>
            {isVerifying ? "Verifying link..." : isRecovery ? "Continue to password reset" : isLoginLink ? "Sign in securely" : "Confirm email"}
          </button>
        )}
        {error && <p role="alert" className="auth-feedback auth-feedback-error">{error}</p>}
        <p className="auth-switch-copy"><Link href="/auth/login">Return to sign in</Link></p>
      </section>
    </main>
  );
}
