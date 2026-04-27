interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
      <div aria-hidden className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-30" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
