import Link from "next/link";
import AuthVisual from "@/components/auth/AuthVisual";
import PasswordUpdateForm from "@/components/auth/PasswordUpdateForm";

export default function UpdatePasswordPage() {
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
      <section className="auth-form-panel" aria-label="Update password">
        <PasswordUpdateForm />
      </section>
    </main>
  );
}
