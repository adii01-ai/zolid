import StudioWorkspace, {
  type StudioGeneration,
} from "@/components/studio/StudioWorkspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StudioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits: number | null = null;
  let allowanceConfigured = false;
  let recentGenerations: StudioGeneration[] | null = [];

  if (user) {
    const profileResult = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    const profileCredits = profileResult.data?.credits;
    if (typeof profileCredits === "number") credits = profileCredits;
    allowanceConfigured =
      !profileResult.error &&
      typeof profileCredits === "number";

    try {
      const admin = createSupabaseAdminClient();
      const generationResult = await admin
        .from("depth_generation_reservations")
        .select("id,source,completed_at,preview_data_url")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(4);
      recentGenerations = generationResult.error
        ? null
        : (generationResult.data ?? []).map((generation) => ({
            id: generation.id,
            source: generation.source as "free" | "purchased",
            completedAt: generation.completed_at ?? "",
            previewDataUrl: generation.preview_data_url,
          }));
    } catch {
      recentGenerations = null;
    }
  }

  return (
    <main className="w-full px-4 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
      <StudioWorkspace
        credits={credits}
        allowanceConfigured={allowanceConfigured}
        recentGenerations={recentGenerations}
      />
    </main>
  );
}
