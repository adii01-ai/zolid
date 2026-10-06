const faqs = [
  {
    question: "Is my photo private?",
    answer:
      "Your image is sent to the authenticated depth-estimation service to create your relief.",
  },
  {
    question: "Can I use the models commercially?",
    answer:
      "We will publish the terms before launch and state clearly what you can do with generated models.",
  },
  {
    question: "Which photos work best?",
    answer:
      "One object, even light, a plain background, and at least 256 pixels on the short side.",
  },
  {
    question: "What does the depth relief show?",
    answer:
      "It captures the visible depth in one image. Rotate and inspect the relief before exporting.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-300">
          Good to know
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mt-9 max-w-3xl">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-slate-800 py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-slate-100 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="text-xl text-cyan-300 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[60ch] pb-2 text-[15px] leading-7 text-slate-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
