export default function Modes() {
  return (
    <section
      id="modes"
      className="scroll-mt-24 border-y border-slate-800 bg-slate-900/30 px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-300">
          Depth relief
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Turn a single image into a 3D relief
        </h2>
        <div className="mt-10 max-w-3xl rounded-lg border border-slate-700 bg-[#0b1120] p-6 sm:p-8">
          <p className="text-sm font-semibold text-cyan-300">
            Three free generations for every new account
          </p>
          <h3 className="mt-4 text-2xl font-semibold text-white">
            Depth relief
          </h3>
          <p className="mt-3 leading-7 text-slate-300">
            Create a front-facing depth surface from one image, then inspect it
            in the interactive viewer and export a GLB.
          </p>
        </div>
      </div>
    </section>
  );
}
