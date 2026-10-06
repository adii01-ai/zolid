const useCases = [
  "Game developers",
  "3D printing",
  "Online sellers",
  "Designers",
];

export default function UseCases() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-300">
          Made for creative work
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          One image, many ways forward
        </h2>
        <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase, index) => (
            <div key={useCase} className="min-h-36 bg-[#0b1120] p-6">
              <span className="text-sm font-semibold text-indigo-300">
                0{index + 1}
              </span>
              <h3 className="mt-6 text-lg font-semibold text-white">
                {useCase}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
