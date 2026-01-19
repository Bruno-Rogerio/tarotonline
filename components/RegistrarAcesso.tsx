"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegistrarAcesso() {
  const pathname = usePathname();

  useEffect(() => {
    async function registrar() {
      try {
        // Verifica se já registrou acesso nesta sessão (evita duplicar)
        const sessionKey = `acesso_${pathname}`;
        if (sessionStorage.getItem(sessionKey)) return;

        // Busca localização pelo IP
        const response = await fetch(
          "https://ip-api.com/json/?fields=status,city,regionName,query"
        );
        const data = await response.json();

        if (data.status === "success") {
          await supabase
            .from("acessos")
            .insert({
              pagina: pathname,
              estado: data.regionName || "Desconhecido",
              cidade: data.city || "Desconhecida",
              ip: data.query,
            })
            .then(({ data, error }) => {
              console.log("Supabase insert:", { data, error });
            });

          // Marca que já registrou nesta sessão
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (error) {
        console.error("Erro ao registrar acesso:", error);
      }
    }

    registrar();
  }, [pathname]);

  return null;
}
