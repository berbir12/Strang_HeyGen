import { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthFeature = {
  icon: ReactNode;
  title: string;
  desc: string;
};

type AuthShellProps = {
  badge: string;
  heading: ReactNode;
  description: string;
  features: AuthFeature[];
  quote: string;
  quoteAuthor: string;
  quoteRole: string;
  cardTitle: string;
  cardSubtitle: string;
  children: ReactNode;
};

const AuthShell = ({
  badge,
  heading,
  description,
  features,
  quote,
  quoteAuthor,
  quoteRole,
  cardTitle,
  cardSubtitle,
  children,
}: AuthShellProps) => {
  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col lg:flex-row">
        <aside className="relative overflow-hidden border-b border-white/10 px-6 py-8 sm:px-8 lg:w-[46%] lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
          <div
            className="pointer-events-none absolute -top-24 -left-24 h-[340px] w-[340px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(265 90% 60%), transparent 70%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[280px] w-[280px] rounded-full opacity-35 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(296 88% 62%), transparent 70%)" }}
            aria-hidden
          />

          <div className="relative z-10 flex h-full flex-col">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src="/strang-logo.png" alt="Strang" className="h-10 w-10 rounded-xl border border-white/20 shadow-lg shadow-purple-500/20" />
              <span className="font-display text-xl font-bold text-white">Strang</span>
            </Link>

            <div className="mt-10 space-y-5 lg:mt-14">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300/90">{badge}</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                {heading}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-white/70">{description}</p>
            </div>

            <div className="mt-8 space-y-4 lg:mt-10">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-400/30 bg-purple-500/15 text-purple-300">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{feature.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:mt-auto">
              <p className="text-sm italic leading-relaxed text-white/70">"{quote}"</p>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-xs font-bold text-white">
                  {quoteAuthor.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80">{quoteAuthor}</p>
                  <p className="text-[11px] text-white/50">{quoteRole}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
            style={{ background: "radial-gradient(ellipse 80% 55% at 50% -10%, hsl(265 90% 64% / 0.28), transparent)" }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(147,51,234,0.08),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(236,72,153,0.08),transparent_45%)]" aria-hidden />

          <section className="relative z-10 w-full max-w-[430px] rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
            <div className="mb-6">
              <h1 className="font-display text-[30px] font-bold tracking-tight text-white">{cardTitle}</h1>
              <p className="mt-1.5 text-sm text-white/60">{cardSubtitle}</p>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AuthShell;
