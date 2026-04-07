import Greeting from '@/components/Greeting';
import AreaSection from '@/components/AreaSection';

const AREAS = [
  {
    title: 'Recursos Humanos',
    apps: [
      {
        icon: '🏖',
        name: 'Solicitud de Vacaciones',
        description: 'Solicita vacaciones, home office o permisos personales',
        url: 'https://script.google.com/macros/s/AKfycbyMQy1DReJzNR_K_GZpEhkwKHl4JIYTspvbYKOHdcm2iOQuuU8m6m06eVcHY-s6XgVl-Q/exec',
      },
      {
        icon: '🔄',
        name: 'Cambios y Reposiciones',
        description: 'Solicita reposición de equipo, uniforme, tarjetas u otros',
        url: 'https://docs.google.com/forms/d/115rvI-D6tKEgJIITUFBdL6lfCtjOREKqOa4HcW7Vfh4/viewform',
      },
      {
        icon: '📋',
        name: 'Evaluación de Desempeño',
        description: 'Consulta y gestiona evaluaciones de desempeño',
        comingSoon: true,
      },
      {
        icon: '👤',
        name: 'Alta / Baja de Personal',
        description: 'Registro de ingresos y bajas de colaboradores',
        comingSoon: true,
      },
    ],
  },
  {
    title: 'Operaciones de Obra',
    apps: [
      {
        icon: '📊',
        name: 'Control RSAO',
        description: 'Seguimiento de actividades y fotografías por proyecto',
        url: 'https://docs.google.com/spreadsheets/d/1xlPhbBaCgfuegiWWwrnLVd3Ux0imyqb2VqBN-gh3qEs',
      },
      {
        icon: '📁',
        name: 'Drive — Archivo de Obra',
        description: 'Carpetas de reportes, planos y documentación',
        url: 'https://drive.google.com/drive/folders/1Jjh1n_NM841xCIl_gHtxrOVMR05lZPZD',
      },
    ],
  },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <Greeting />

      {AREAS.map((area, idx) => (
        <AreaSection key={idx} title={area.title} apps={area.apps} />
      ))}
    </div>
  );
}
