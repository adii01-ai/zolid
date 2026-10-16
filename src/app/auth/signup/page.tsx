import AuthForm from "@/components/auth/AuthForm";
import LoginVisual from "@/components/auth/LoginVisual";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import Link from "next/link";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-screen auth-login-screen">
      <section className="auth-visual-panel" aria-label="Welcome to Zolid">
        <Link className="auth-brand" href="/" aria-label="Zolid home">
          <span className="auth-brand-mark" aria-hidden="true">
            Z
          </span>
          <span>Zolid</span>
        </Link>
        <h2 className="auth-hero-title">
          Turn any photo into a <span>relief</span> you can <span>tilt.</span>
        </h2>
        <LoginVisual />
        <div className="auth-visual-copy">
          <p>
            Create an account to get 15 starter credits for depth reliefs and
            background removal.
          </p>
        </div>
      </section>
      <section className="auth-form-panel" aria-label="Create account">
        <AuthForm mode="signup" nextPath={getSafeAuthRedirect(params.next)} />
      </section>
    </main>
  );
}
