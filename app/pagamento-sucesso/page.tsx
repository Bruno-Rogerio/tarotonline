"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PagamentoSucessoPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Pagamento Confirmado!
        </h1>
        <p className="text-purple-200 mb-6">
          Seus minutos já foram adicionados à sua conta. Você já pode iniciar
          uma consulta!
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg transition-all hover:scale-105"
        >
          Ir para o início
        </Link>
        <p className="text-white/50 text-sm mt-4">
          Redirecionando em 5 segundos...
        </p>
      </div>
    </div>
  );
}
