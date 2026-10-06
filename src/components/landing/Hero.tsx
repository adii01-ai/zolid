import Link from "next/link";

export default function Hero() {
  return (
    <>
      <section className="px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
              Photo to 3D, made simple
            </p>
            <h1 className="max-w-[13ch] text-5xl font-bold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Turn any photo into a 3D model.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Create a front-facing depth relief from one image, then inspect
              and export it in the interactive viewer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#upload"
                className="rounded-md bg-cyan-300 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
              >
                Try free: upload a photo
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-slate-600 px-5 py-3 text-center font-semibold text-white transition hover:border-indigo-300 hover:text-indigo-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Three free depth relief generations for every new account
            </p>
          </div>
          <div
            className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 sm:min-h-[420px]"
            aria-label="Rotating 3D cube visual"
          >
            <div className="landing-cube-scene" aria-hidden="true">
              <div className="landing-cube">
                <span className="landing-cube-face landing-cube-front" />
                <span className="landing-cube-face landing-cube-back" />
                <span className="landing-cube-face landing-cube-right" />
                <span className="landing-cube-face landing-cube-left" />
                <span className="landing-cube-face landing-cube-top" />
                <span className="landing-cube-face landing-cube-bottom" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        id="upload"
        aria-labelledby="upload-heading"
        className="scroll-mt-24 px-5 pb-20 sm:px-8"
      >
        <div className="mx-auto max-w-6xl border-t border-slate-800 pt-10">
          <h2 id="upload-heading" className="text-2xl font-semibold text-white">
            How to use Zolid
          </h2>
          <div
            role="img"
            aria-label="Video placeholder for a Zolid app walkthrough"
            className="mt-5 flex aspect-video w-full max-w-4xl items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-center"
          >
            <div className="px-6 py-8">
              <p className="text-lg font-semibold text-white">How-to video</p>
              <p className="mt-2 text-sm text-slate-400">Video coming soon</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
