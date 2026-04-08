'use client';

interface AppCardProps {
  icon: string;
  name: string;
  description: string;
  url?: string;
  comingSoon?: boolean;
}

export default function AppCard({
  icon,
  name,
  description,
  url,
  comingSoon = false,
}: AppCardProps) {
  if (comingSoon) {
    return (
      <div className="bg-corso-darkHover/50 border border-corso-cream/10 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed animate-fadeIn">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="font-cormorant text-xl font-semibold mb-1">{name}</h3>
        <p className="text-corso-subtle text-sm mb-3">{description}</p>
        <span className="text-xs bg-corso-cream/10 text-corso-subtle px-3 py-1 rounded-full">
          Próximamente
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-corso-darkHover border border-corso-cream/10 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center hover:bg-corso-darkHover/80 hover:border-corso-cream/30 hover:shadow-lg hover:scale-105 group animate-fadeIn"
    >
      <div className="text-5xl mb-4 group-hover:scale-110">{icon}</div>
      <h3 className="font-cormorant text-xl font-normal mb-1 group-hover:text-corso-cream">
        {name}
      </h3>
      <p className="text-curso-subtle text-sm group-hover:text-curso-subtle/80">
        {description}
      </p>
    </a>
  );
}
