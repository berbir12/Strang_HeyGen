const useCases = ["Textbooks", "Research papers", "Long articles", "Technical docs"];

const SocialProofSection = () => {
  return (
    <section className="border-b border-border px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Made for the reading you can’t skim
        </p>
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
          {useCases.map((useCase) => (
            <div key={useCase} className="bg-background px-5 py-4 text-sm font-medium">
              {useCase}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
