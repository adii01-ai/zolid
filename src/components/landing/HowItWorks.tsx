const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Choose a clear JPG, PNG, or WebP image.",
  },
  {
    number: "02",
    title: "Generate",
    description: "Create a front-facing depth relief from your image.",
  },
  {
    number: "03",
    title: "Rotate and download",
    description: "Inspect the result from every angle, then export your model.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-300">
          A simple workflow
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          From photo to model
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="border-t border-slate-700 pt-5"
            >
              <span className="text-sm font-semibold text-indigo-300">
                {step.number}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 max-w-sm leading-7 text-slate-400">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
