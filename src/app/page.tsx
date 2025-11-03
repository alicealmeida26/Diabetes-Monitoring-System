'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Verifica se existe usuário logado no localStorage
    const user = localStorage.getItem('user');
    
    if (user) {
      // Se tiver usuário logado → vai para pacientes
      router.push('/pacientes');
    } else {
      // Se NÃO tiver usuário → vai para login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-gray-600">Carregando...</div>
    </div>
  );
}
