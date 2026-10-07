import AuthForm from "@/components/auth/AuthForm";
import LoginVisual from "@/components/auth/LoginVisual";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; recovery?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-screen auth-login-screen">
      <section className="auth-visual-panel" aria-label="Welcome to Zolid">
        <Link className="auth-brand" href="/" aria-label="Zolid home">
          <span className="auth-brand-mark" aria-hidden="true">Z</span>
          <span>Zolid</span>
        </Link>
        <h2 className="auth-hero-title">
          Turn any photo into a <span>relief</span> you can <span>tilt.</span>
        </h2>
        <LoginVisual />
        <div className="auth-visual-copy">
          <p>Sign in to create depth reliefs and remove backgrounds from your images.</p>
        </div>
      </section>
      <section className="auth-form-panel" aria-label="Sign in">
        <AuthForm
          mode="login"
          nextPath={getSafeAuthRedirect(params.next)}
          callbackError={params.error === "callback"}
          callbackRecoveryError={params.recovery === "1"}
        />
      </section>
    </main>
  );
}