import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface SectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, subtitle, href, icon, children }: SectionProps) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {icon && <span className="text-zinc-300">{icon}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
