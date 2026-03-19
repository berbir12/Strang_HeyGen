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
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Strang (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Strang Chrome extension and the strang.ai website (collectively, the &quot;Service&quot;). This Privacy Policy explains what information we collect, why we collect it, how we use it, and your choices. It applies to both the website and the Chrome extension.
            </p>
          </section>

          {/* ── WEBSITE ─────────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Website</h2>

            <h3 className="font-semibold text-base mb-2">2a. Waitlist</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you join our waitlist we collect your <strong className="text-foreground">email address</strong>. We use it solely to notify you about product updates, early-access invitations, and the public launch. We do not sell or share your email with third-party marketers. You can unsubscribe at any time via the link included in every email.
            </p>

            <h3 className="font-semibold text-base mb-2">2b. Analytics</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our website may use <strong className="text-foreground">Plausible Analytics</strong>, a privacy-friendly, cookieless analytics tool. Plausible does not set cookies, does not track you across sites, and does not collect personally identifiable information. Data is aggregated and used only to understand overall traffic patterns and improve the product.
            </p>
          </section>

          {/* ── CHROME EXTENSION ────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Chrome Extension</h2>

            <h3 className="font-semibold text-base mb-2">3a. Text you submit</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you highlight text on a webpage or paste text into the Strang side panel and click <strong className="text-foreground">Generate video</strong>, that text is transmitted to the Strang backend API to produce a short explainer video. The text is processed transiently to generate the video and is not stored on our servers beyond what is necessary to complete the request. If you self-host the backend, your text goes directly to the server you configured and is subject to that server&apos;s own policies.
            </p>

            <h3 className="font-semibold text-base mb-2">3b. Permissions used and why</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>
                <strong className="text-foreground">activeTab</strong> — accessed only when you click the extension, to read your current text selection for prefilling the generation input. Strang does not run continuously in the background or monitor your browsing.
              </li>
              <li>
                <strong className="text-foreground">sidePanel</strong> — used to display the Strang UI panel inside Chrome without opening a new tab.
              </li>
              <li>
                <strong className="text-foreground">storage</strong> — used to store your session token and settings (e.g. backend URL) locally in your browser via <code>chrome.storage.local</code>. This data never leaves your device except as required to authenticate with the API.
              </li>
              <li>
                <strong className="text-foreground">scripting</strong> — runs a small script on the active tab, triggered only by user action, to capture selected text and pass it to the side panel.
              </li>
              <li>
                <strong className="text-foreground">Host permissions (https://)</strong> — required to make network requests to the Strang API to submit generation jobs, poll for status, and load the resulting video. No requests are made to any other domain.
              </li>
            </ul>

            <h3 className="font-semibold text-base mb-2">3c. Data stored locally</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The extension stores the following data in <code>chrome.storage.local</code> on your device only:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Your authentication session token (used to identify your account with the API)</li>
              <li>Your configured backend API URL</li>
              <li>Your email address (used only to display your username in the extension UI)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              None of this data is sent to third parties. It is cleared when you log out or uninstall the extension.
            </p>
          </section>

          {/* ── THIRD PARTIES ───────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Third-party services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Generating videos requires sending your input to third-party AI and video rendering services (currently OpenAI and HeyGen). When you use the Strang hosted API, your text is passed to these providers solely to produce the video. Each provider&apos;s handling of that data is governed by their own privacy policies:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong className="text-foreground">OpenAI</strong> —{" "}
                <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  openai.com/policies/privacy-policy
                </a>
              </li>
              <li>
                <strong className="text-foreground">HeyGen</strong> —{" "}
                <a href="https://www.heygen.com/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  heygen.com/privacy
                </a>
              </li>
            </ul>
          </section>

          {/* ── DATA SHARING ─────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Data sharing and selling</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong className="text-foreground">not</strong> sell, rent, or trade your personal information to any third party. We do not use your data for advertising, creditworthiness assessment, or any purpose unrelated to operating the Strang service.
            </p>
          </section>

          {/* ── RETENTION ────────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Data retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Waitlist email addresses are retained until you unsubscribe or request deletion. Text submitted for video generation is not stored beyond the time required to process your request. Local extension data is retained on your device until you clear it or uninstall the extension.
            </p>
          </section>

          {/* ── YOUR RIGHTS ──────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Your rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request access to, correction of, or deletion of any personal data we hold about you (such as your waitlist email) by contacting us at the address below. We will respond within a reasonable timeframe.
            </p>
          </section>

          {/* ── CHANGES ──────────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. Material changes will be communicated via the website or, where applicable, by email. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* ── CONTACT ──────────────────────────────────────── */}
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about this policy or requests regarding your data:{" "}
              <a href="mailto:hello@strang.ai" className="text-primary hover:underline">
                hello@strang.ai
              </a>
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
