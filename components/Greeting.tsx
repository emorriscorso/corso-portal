'use client';

import { useEffect, useState } from 'react';

export default function Greeting() {
  const [greeting, setGreeting] = useState('Buenos días');

  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting('Buenos días');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  return (
    <div className="mb-12 animate-fadeIn">
      <h2 className="font-cormorant text-3xl sm:text-4xl font-normal mb-2">
        {greeting}.
      </h2>
      <p className="text-curso-subtle text-lg">
        ¿En qué trabajamos hoy?
      </p>
    </div>
  );
}
