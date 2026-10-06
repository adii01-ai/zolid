import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="px-5 pb-20 pt-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-indigo-400/30 bg-gradient-to-br from-cyan-300/10 to-indigo-400/10 px-6 py-14 text-center sm:px-10">
          <h2 className="mx-auto max-w-[20ch] text-3xl font-bold leading-tight text-white sm:text-4xl">
            Make your first 3D model
          </h2>
          <p className="mx-auto mt-4 max-w-[56ch] text-slate-300">
            The free mode needs no account.
          </p>
          <Link
            href="#upload"
            className="mt-7 inline-flex items-center justify-center rounded-md bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
          >
            Upload a photo
          </Link>
        </div>
      </div>
    </section>
  );
}
