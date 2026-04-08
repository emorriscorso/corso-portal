'use client';

import AppCard from './AppCard';

interface App {
  icon: string;
  name: string;
  description: string;
  url?: string;
  comingSoon?: boolean;
}

interface AreaSectionProps {
  title: string;
  apps: App[];
}

export default function AreaSection({ title, apps }: AreaSectionProps) {
  return (
    <section className="mb-16">
      <h2 className="font-cormorant text-2xl tracking-wide text-corso-cream/70 uppercase mb-6 font-normal">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app, idx) => (
          <AppCard key={idx} {...app} />
        ))}
      </div>
    </section>
  );
}
