import AuthForm from "@/components/auth/AuthForm";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-6 py-12">
      <AuthForm mode="signup" nextPath={getSafeAuthRedirect(params.next)} />
    </main>
  );
}