import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal Interno — Corso Arquitectura',
  description: 'Escritorio digital interno de Corso Arquitectura',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-corso-dark text-corso-cream min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-corso-cream/10 py-6 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-cormorant text-4xl sm:text-5xl tracking-wide font-semibold">
              CORSO
            </h1>
            <p className="text-corso-subtle text-sm mt-1 tracking-wide">
              Portal Interno
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-8 py-8 sm:py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-corso-cream/10 py-4 px-4 sm:px-8 text-xs text-corso-subtle text-center">
          <p>© 2026 Corso Arquitectura. Portal Interno.</p>
        </footer>
      </body>
    </html>
  );
}
