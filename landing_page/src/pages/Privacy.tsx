import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Strang
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Strang (&quot;we&quot;) operates the Strang Chrome extension and related websites. This policy describes what data we collect and how we use it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">2. Data we collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Waitlist:</strong> If you join the waitlist on our website, we collect your email address to notify you about product updates and launch information.</li>
              <li><strong className="text-foreground">Extension:</strong> The Strang extension runs in your browser. Text you select or paste is sent to our API (or a backend you configure) to generate videos. We do not store that text on our servers unless you use our hosted API, in which case it is processed to generate the video and handled according to our data practices.</li>
              <li><strong className="text-foreground">Local storage:</strong> The extension may store your backend URL and preferences locally in your browser. This data stays on your device.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">3. How we use data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use waitlist emails to send launch and product updates. We use text and API requests to provide the video generation service. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">4. Third parties</h2>
            <p className="text-muted-foreground leading-relaxed">
              Video generation uses third-party services (e.g. AI and video APIs). When you use our hosted API, your input may be processed by those providers under their privacy terms. If you point the extension at your own backend, your data is subject to that backend&apos;s policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">5. Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website may use privacy-friendly analytics (e.g. Plausible) that do not use cookies. We use this to understand traffic and improve the product.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">6. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this policy or your data, contact us at the email or link provided on our website.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 px-4 mt-12 text-center">
        <Link to="/" className="text-sm text-primary hover:text-primary/90">
          Back to home
        </Link>
      </footer>
    </div>
  );
};

export default Privacy;
