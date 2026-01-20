// lib/fidelidade.ts
// Utilitário para verificar e aplicar bônus de fidelidade

export async function verificarBonusFidelidade(
  usuarioId: string,
  minutosUsados: number
): Promise<{
  bonusAplicado: boolean;
  minutosGanhos: number;
  mensagem: string;
  detalhes?: string[];
}> {
  try {
    const response = await fetch("/api/fidelidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, minutosUsados }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao verificar bônus:", data.error);
      return {
        bonusAplicado: false,
        minutosGanhos: 0,
        mensagem: "Erro ao verificar bônus",
      };
    }

    return {
      bonusAplicado: data.bonusAplicado,
      minutosGanhos: data.minutosGanhos,
      mensagem: data.mensagem,
      detalhes: data.detalhes,
    };
  } catch (error) {
    console.error("Erro ao verificar bônus:", error);
    return {
      bonusAplicado: false,
      minutosGanhos: 0,
      mensagem: "Erro ao verificar bônus",
    };
  }
}

export async function buscarProgressoFidelidade(usuarioId: string) {
  try {
    const response = await fetch(`/api/fidelidade?usuarioId=${usuarioId}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao buscar progresso:", data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar progresso:", error);
    return null;
  }
}
