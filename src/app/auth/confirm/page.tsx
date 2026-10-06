import ConfirmEmail from "@/components/auth/ConfirmEmail";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";

type ConfirmPageProps = {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; flow?: string }>;
};

const verificationTypes = new Set([
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
]);

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const type = params.type && verificationTypes.has(params.type)
    ? params.type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change"
    : null;
  const nextPath = getSafeAuthRedirect(params.next);
  const destination = type === "recovery" ? "/auth/update-password" : nextPath;
  const flow = params.flow === "login" || params.flow === "signup" || params.flow === "recovery"
    ? params.flow
    : null;

  return (
    <ConfirmEmail
      tokenHash={params.token_hash ?? ""}
      type={type}
      nextPath={destination}
      flow={flow}
    />
  );
}
