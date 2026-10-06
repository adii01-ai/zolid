"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath: string;
  callbackError?: boolean;
  callbackRecoveryError?: boolean;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function AuthForm({
  mode,
  nextPath,
  callbackError = false,
  callbackRecoveryError = false,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(
    callbackError
      ? {
          type: "error",
          message: callbackRecoveryError
            ? "That password reset link is invalid or expired. Request a new one to continue."
            : "That confirmation link is invalid or expired. Request a fresh confirmation email and try again.",
        }
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLoginLink, setIsSendingLoginLink] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [confirmationExpired, setConfirmationExpired] = useState(
    callbackError && !callbackRecoveryError,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(callbackRecoveryError);
  const isLogin = mode === "login";
  const destination = getSafeAuthRedirect(nextPath);

  function getEmailDeliveryError(error: unknown, action: string) {
    const authError = error as { message?: string; status?: number; code?: string } | null;
    const message = authError?.message?.toLowerCase() ?? "";
    const code = authError?.code?.toLowerCase() ?? "";
    if (
      code.includes("user_already_exists") ||
      code.includes("email_exists") ||
      message.includes("already registered")
    ) {
      return "An account already uses this email. Sign in instead, or choose Forgot password? if you need to reset it.";
    }
    if (code.includes("email_address_invalid") || message.includes("invalid email")) {
      return "That email address looks invalid. Check it and try again.";
    }
    if (
      authError?.status === 429 ||
      code.includes("rate_limit") ||
      code.includes("over_email_send_rate_limit") ||
      message.includes("rate limit") ||
      message.includes("too many")
    ) {
      return "Too many emails were requested recently. Wait a few minutes before trying again.";
    }
    if (
      code.includes("email_provider_disabled") ||
      message.includes("smtp") ||
      message.includes("email provider") ||
      message.includes("sending confirmation email") ||
      message.includes("sending recovery email")
    ) {
      return "Supabase could not send the email. Check Authentication → Emails → SMTP and the provider’s delivery logs.";
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[ZOLID] Auth email request failed", {
        action,
        code: authError?.code,
        status: authError?.status,
        message: authError?.message,
      });
    }
    const reference = authError?.code ?? authError?.status;
    return reference
      ? `We couldn't ${action}. Supabase reported ${reference}; check Authentication logs and SMTP delivery logs.`
      : `We couldn't ${action}. Check Supabase Authentication logs and SMTP delivery logs.`;
  }

  async function sendLoginLink() {
    const emailValidation = loginSchema.shape.email.safeParse(email.trim());
    if (!emailValidation.success) {
      setFieldErrors({ email: "Enter a valid email address first." });
      return;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      setFeedback({ type: "error", message: "Sign-in links are temporarily unavailable." });
      return;
    }

    setIsSendingLoginLink(true);
    setFeedback(null);
    try {
      const callbackUrl = new URL("/auth/confirm", appUrl);
      callbackUrl.searchParams.set("next", destination);
      callbackUrl.searchParams.set("flow", "login");
      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: emailValidation.data,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: callbackUrl.toString(),
        },
      });
      setFeedback(error
        ? { type: "error", message: getEmailDeliveryError(error, "send a sign-in link") }
        : { type: "success", message: "If this email has an account, a sign-in link is on its way. Check your inbox and spam folder." });
    } catch (error) {
      setFeedback({ type: "error", message: getEmailDeliveryError(error, "send a sign-in link") });
    } finally {
      setIsSendingLoginLink(false);
    }
  }

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const expired =
      hash.get("error_code") === "otp_expired" ||
      (hash.get("error") === "access_denied" &&
        hash.get("error_description")?.toLowerCase().includes("expired"));

    if (!expired) return;

    setConfirmationExpired(true);
    setFeedback({
      type: "error",
      message:
        "This email confirmation link has expired. Sign in if you already confirmed your account, or request a fresh link below.",
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  async function resendConfirmation() {
    const normalizedEmail = email.trim();
    const emailValidation = loginSchema.shape.email.safeParse(normalizedEmail);
    if (!emailValidation.success) {
      setFieldErrors({ email: "Enter your email address first." });
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      setFeedback({
        type: "error",
        message: "Confirmation emails are temporarily unavailable.",
      });
      return;
    }

    setIsResendingConfirmation(true);
    setFeedback(null);
    try {
      const callbackUrl = new URL("/auth/confirm", appUrl);
      callbackUrl.searchParams.set("next", destination);
      callbackUrl.searchParams.set("flow", "signup");
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: { emailRedirectTo: callbackUrl.toString() },
      });

      if (error) {
        setFeedback({
          type: "error",
          message: getEmailDeliveryError(error, "send a new confirmation link"),
        });
        return;
      }

      setFeedback({
        type: "success",
        message:
          "If this account needs confirmation, a fresh link has been sent to that email address.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getEmailDeliveryError(error, "send a new confirmation link"),
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setFieldErrors({});

    if (recoveryMode) {
      const emailValidation = loginSchema.shape.email.safeParse(email.trim());
      if (!emailValidation.success) {
        setFieldErrors({ email: "Enter a valid email address." });
        return;
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        setFeedback({ type: "error", message: "Password reset is temporarily unavailable." });
        return;
      }
      setIsSubmitting(true);
      try {
        const callbackUrl = new URL("/auth/confirm", appUrl);
        callbackUrl.searchParams.set("next", "/auth/update-password");
        callbackUrl.searchParams.set("flow", "recovery");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.resetPasswordForEmail(emailValidation.data, {
          redirectTo: callbackUrl.toString(),
        });
        setFeedback(error
          ? { type: "error", message: getEmailDeliveryError(error, "send a reset link") }
          : { type: "success", message: "If an account uses that email, a password reset link is on its way." });
      } catch (error) {
        setFeedback({ type: "error", message: getEmailDeliveryError(error, "send a reset link") });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const schema = isLogin ? loginSchema : signupSchema;
    const validation = schema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword(
          validation.data,
        );
        if (error) {
          setFeedback({
            type: "error",
            message: "Email or password is incorrect.",
          });
          return;
        }

        window.location.assign(destination);
        return;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        setFeedback({
          type: "error",
          message: "Sign-up is temporarily unavailable.",
        });
        return;
      }

      const callbackUrl = new URL("/auth/confirm", appUrl);
      callbackUrl.searchParams.set("next", destination);
      callbackUrl.searchParams.set("flow", "signup");
      const { data, error } = await supabase.auth.signUp({
        ...validation.data,
        options: { emailRedirectTo: callbackUrl.toString() },
      });

      if (error) {
        setFeedback({
          type: "error",
          message: getEmailDeliveryError(error, "create your account"),
        });
        return;
      }

      if (data.session) {
        window.location.assign(destination);
        return;
      }

      setFeedback({
        type: "success",
        message:
          "Check your email for a confirmation link to finish creating your account.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: isLogin
          ? "We couldn't sign you in. Check your connection and try again."
          : getEmailDeliveryError(error, "create your account"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-form" aria-labelledby="auth-heading">
      <p className="auth-eyebrow">{recoveryMode ? "Account recovery" : isLogin ? "Welcome back" : "Create your account"}</p>
      <h1 id="auth-heading" className="auth-title">
        {recoveryMode ? "Reset your password" : isLogin ? "Sign in to Zolid" : "Get started with Zolid"}
      </h1>
      <p className="auth-description">
        {recoveryMode
          ? "Enter your email and we’ll send you a secure reset link."
          : isLogin
            ? "Use your email and password to continue."
            : "Sign up with your email to save your work."}
      </p>

      <form className="auth-fields" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="auth-email">Email</label>
          </div>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
            className="auth-input"
            placeholder="you@example.com"
          />
          {fieldErrors.email && <p id="auth-email-error" className="auth-field-error">{fieldErrors.email}</p>}
        </div>

        {!recoveryMode && (
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Password</label>
              {isLogin && (
                <button className="auth-inline-link" type="button" onClick={() => { setRecoveryMode(true); setFeedback(null); setFieldErrors({}); }}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="auth-password-wrap">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
                className="auth-input"
                placeholder={isLogin ? "Your password" : "At least 8 characters"}
              />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && <p id="auth-password-error" className="auth-field-error">{fieldErrors.password}</p>}
          </div>
        )}

        {feedback && (
          <p role={feedback.type === "error" ? "alert" : "status"} className={`auth-feedback auth-feedback-${feedback.type}`}>
            {feedback.message}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className="auth-submit">
          {isSubmitting
            ? recoveryMode ? "Sending reset link..." : isLogin ? "Signing in..." : "Creating account..."
            : recoveryMode ? "Send reset link" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      {isLogin && !recoveryMode && (
        <button
          type="button"
          className="auth-secondary-submit"
          disabled={isSendingLoginLink || isSubmitting}
          onClick={() => void sendLoginLink()}
        >
          {isSendingLoginLink ? "Sending sign-in link..." : "Email me a sign-in link"}
        </button>
      )}

      {recoveryMode ? (
        <button type="button" className="auth-back-link" onClick={() => { setRecoveryMode(false); setFeedback(null); setFieldErrors({}); }}>
          Back to sign in
        </button>
      ) : (
        <>
          {isLogin && confirmationExpired && (
            <button type="button" onClick={() => void resendConfirmation()} disabled={isResendingConfirmation} className="auth-secondary-submit">
              {isResendingConfirmation ? "Sending confirmation link..." : "Send a fresh confirmation link"}
            </button>
          )}
          <p className="auth-switch-copy">
            {isLogin ? "New to Zolid? " : "Already have an account? "}
            <Link href={isLogin ? `/auth/signup?next=${encodeURIComponent(destination)}` : `/auth/login?next=${encodeURIComponent(destination)}`}>
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
          {isLogin && <p className="auth-legal">By signing in, you agree to Zolid&apos;s terms and privacy policy.</p>}
        </>
      )}
    </section>
  );
}
