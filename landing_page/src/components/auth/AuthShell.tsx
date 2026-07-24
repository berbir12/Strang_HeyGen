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
  quote?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  cardTitle: string;
  cardSubtitle: string;
  children: ReactNode;
};

const AuthShell = ({
  badge,
  heading,
  description,
  features,
  cardTitle,
  cardSubtitle,
  children,
}: AuthShellProps) => {
  return (
    <div className="auth-shell min-h-screen bg-[#191816] text-[#f4f0e7]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1px_1fr]">
        <aside className="relative flex px-6 py-7 sm:px-10 lg:justify-end lg:px-14 lg:py-10">
          <div className="flex w-full max-w-[560px] flex-col">
            <Link to="/" className="inline-flex items-center gap-2.5 self-start">
              <img src="/strang-logo.png" alt="Strang" className="h-9 w-9 rounded-md" />
              <span className="font-display text-2xl font-semibold">Strang</span>
            </Link>

            <div className="my-auto py-14 lg:py-20">
              <div className="mb-7 flex items-center gap-3 text-sm font-medium">
                <span className="h-px w-8 bg-[#df694c]" />
                <span className="text-[#a9a298]">{badge}</span>
              </div>
              <h2 className="max-w-[11ch] font-display text-5xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                {heading}
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-[#aaa49a]">
                {description}
              </p>

              <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-[#393631] bg-[#393631] sm:grid-cols-3 lg:grid-cols-1">
                {features.map((feature) => (
                  <div key={feature.title} className="flex gap-3 bg-[#201f1c] p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#2c2925] text-[#df694c]">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#8f8980]">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#777169]">One complete trial video · No credit card</p>
          </div>
        </aside>

        <div className="hidden bg-[#393631] lg:block" aria-hidden />

        <main className="flex items-center justify-center border-t border-[#393631] bg-[#201f1c] px-5 py-12 lg:border-0">
          <section className="w-full max-w-[430px]">
            <div className="mb-8 border-b border-[#393631] pb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#df694c]">
                Strang account
              </p>
              <h1 className="font-display text-4xl font-semibold tracking-tight">{cardTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#928c83]">{cardSubtitle}</p>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AuthShell;
