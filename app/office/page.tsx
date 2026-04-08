import type { Metadata } from 'next';
import OfficeDashboard from '@/components/office/OfficeDashboard';

export const metadata: Metadata = {
  title: 'Live Office — Corso Arquitectura',
  description: 'Vista operativa en vivo de agentes OpenClaw y sus sesiones activas.',
};

export default function OfficePage() {
  return <OfficeDashboard />;
}
