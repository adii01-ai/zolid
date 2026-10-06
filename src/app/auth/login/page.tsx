import AuthForm from "@/components/auth/AuthForm";
import AuthVisual from "@/components/auth/AuthVisual";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; recovery?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-screen">
      <section className="auth-visual-panel" aria-label="Welcome to Zolid">
        <Link className="auth-brand" href="/" aria-label="Zolid home">
          <span className="auth-brand-mark" aria-hidden="true">Z</span>
          <span>Zolid</span>
        </Link>
        <AuthVisual />
        <div className="auth-visual-copy">
          <h2>Turn any photo into a relief you can tilt.</h2>
          <p>Sign in to generate depth reliefs and remove backgrounds from your images.</p>
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