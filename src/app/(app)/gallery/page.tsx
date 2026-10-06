import Link from "next/link";
import Image from "next/image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let generations:
    | {
        id: string;
        source: "free" | "purchased";
        completed_at: string;
        preview_data_url: string | null;
      }[]
    | null = [];

  if (user) {
    try {
      const admin = createSupabaseAdminClient();
      const result = await admin
        .from("depth_generation_reservations")
        .select("id,source,completed_at,preview_data_url")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(50);

      generations = result.error ? null : (result.data ?? []);
    } catch {
      generations = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#FFB547]">Your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3EDE2] sm:text-4xl">
            Gallery
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#9D9484] sm:text-base">
            Your completed depth relief generations.
          </p>
        </div>
        <Link
          href="/studio"
          className="rounded-md bg-[#FFB547] px-4 py-2.5 text-sm font-semibold text-[#15130F] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
        >
          Create depth relief
        </Link>
      </header>

      {generations === null ? (
        <section
          role="status"
          className="rounded-xl border border-[#66502D] bg-[#1D1A15] p-6 text-sm text-[#F3EDE2]"
        >
          Your depth relief history is unavailable right now. Please refresh and
          try again.
        </section>
      ) : generations.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[#5A4930] bg-[#1D1A15] px-5 py-14 text-center">
          <h2 className="text-lg font-semibold text-[#F3EDE2]">
            No depth reliefs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9D9484]">
            Successfully generated depth reliefs will appear here.
          </p>
          <Link
            href="/studio"
            className="mt-5 inline-flex rounded-md bg-[#FFB547] px-4 py-2.5 text-sm font-semibold text-[#15130F] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
          >
            Go to Studio
          </Link>
        </section>
      ) : (
        <>
          <p className="mb-3 text-xs text-[#9D9484]">
            Showing the latest {generations.length}{" "}
            {generations.length === 1 ? "generation" : "generations"}.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {generations.map((generation) => (
              <li
                key={generation.id}
                className="min-w-0 rounded-lg border border-[#37321F] bg-[#1D1A15] p-4"
              >
                <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-md border border-[#37321F] bg-[#15130F]">
                  {generation.preview_data_url ? (
                    <Image
                      src={generation.preview_data_url}
                      alt={`Depth relief ${generation.id.slice(0, 8)}`}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-xs text-[#9D9484]">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-[#F3EDE2]">
                      Depth relief {generation.id.slice(0, 8)}
                    </p>
                    <time
                      dateTime={generation.completed_at}
                      className="mt-1 block text-xs text-[#9D9484]"
                    >
                      Completed{" "}
                      {new Date(generation.completed_at).toLocaleString("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#8FBF9F]/30 px-2.5 py-1 text-xs capitalize text-[#B7D5BF]">
                    {generation.source === "free" ? "Free" : "Credit"}
                  </span>
                </div>
                <p className="mt-4 border-t border-[#37321F] pt-3 text-sm text-[#9D9484]">
                  Depth relief preview
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
