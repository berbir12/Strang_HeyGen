import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What kind of text can I use?",
    a: "Any text—articles, textbook passages, definitions, Wikipedia, or your own notes. Strang works best with clear, factual content (e.g. medical or scientific explanations).",
  },
  {
    q: "How long does a video take?",
    a: "Usually 2–4 minutes. We write a script and then generate the video. You can keep using the tab while it runs.",
  },
  {
    q: "Is there a limit on text length?",
    a: "We recommend a few paragraphs (up to about 3,000 characters) per video for the best result. Longer text may take longer to process.",
  },
  {
    q: "Do I need to create an account?",
    a: "Yes. Create a Strang account to manage usage, billing, and access your dashboard. You can sign up for free and upgrade later.",
  },
  {
    q: "How do I install the extension?",
    a: "Use the Install Extension button on this page. It opens the Chrome Web Store listing so you can add Strang in one click.",
  },
  {
    q: "What happens after I sign in?",
    a: "You get access to your dashboard and can start generating videos from highlighted text directly in the extension side panel.",
  },
];

const FAQ = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-center">
          FAQ
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Quick answers to common questions.
        </p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`item-${i}`}
              className="border border-border rounded-xl px-4 mb-3 bg-card/40 backdrop-blur-sm"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
