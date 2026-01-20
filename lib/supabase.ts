import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Usuario = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: "cliente" | "admin";
  minutos_disponiveis: number;
  created_at: string;
  data_nascimento: string | null;
};

export type Tarologo = {
  id: string;
  nome: string;
  avatar_url: string | null;
  biografia: string | null;
  especialidade: string | null;
  total_consultas: number;
  avaliacao_media: number;
  status: "disponivel" | "ocupado" | "indisponivel";
  ordem: number | null;
  created_at: string;
};

export type Sessao = {
  id: string;
  usuario_id: string;
  tarologo_id: string;
  admin_id: string | null;
  minutos_comprados: number;
  minutos_usados: number;
  bonus_usado: boolean;
  status: "aguardando" | "em_andamento" | "finalizada";
  inicio: string | null;
  fim: string | null;
  created_at: string;
};

export type Mensagem = {
  id: string;
  sessao_id: string;
  remetente_id: string;
  mensagem: string;
  created_at: string;
};

export type CartaMesa = {
  id: string;
  sessao_id: string;
  ordem: number;
  nome_carta: string;
  imagem_url: string | null;
  created_at: string;
};

export type TipoDesconto = "porcentagem" | "valor_fixo" | "minutos_extras";
export type StatusCupom = "ativo" | "inativo" | "expirado";
export type OrigemCupom =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "google"
  | "influencer"
  | "indicacao"
  | null;

export type Cupom = {
  id: string;
  codigo: string;
  descricao: string | null;

  // Tipo de desconto
  tipo_desconto: TipoDesconto;
  valor_desconto: number; // % ou R$ ou minutos extras

  // Regras
  valor_minimo: number;
  limite_total_usos: number | null;
  limite_por_usuario: number;
  apenas_novos_usuarios: boolean;

  // Validade
  data_inicio: string;
  data_fim: string | null;

  // Origem/Marketing
  origem: OrigemCupom;
  influencer_nome: string | null;

  // Status
  status: StatusCupom;

  // Rastreamento
  total_usos: number;
  total_desconto_concedido: number;
  total_minutos_extras_dados: number;

  // Metadata
  created_at: string;
  updated_at: string;
  criado_por: string | null;
};

export type CupomUso = {
  id: string;
  cupom_id: string;
  usuario_id: string;
  compra_id: string | null;

  valor_original: number;
  valor_desconto: number;
  valor_final: number;
  minutos_extras: number;

  created_at: string;

  // Relacionamentos (quando fazer join)
  cupom?: Cupom;
  usuario?: Usuario;
};

// Tipo para criar cupom (sem campos automáticos)
export type CupomInsert = {
  codigo: string;
  descricao?: string;
  tipo_desconto: TipoDesconto;
  valor_desconto: number;
  valor_minimo?: number;
  limite_total_usos?: number | null;
  limite_por_usuario?: number;
  apenas_novos_usuarios?: boolean;
  data_inicio?: string;
  data_fim?: string | null;
  origem?: OrigemCupom;
  influencer_nome?: string | null;
  status?: StatusCupom;
};

// Tipo para atualizar cupom
export type CupomUpdate = Partial<CupomInsert> & {
  status?: StatusCupom;
};

// Tipo para resultado da validação de cupom
export type ValidacaoCupom = {
  valido: boolean;
  cupom_id: string | null;
  tipo_desconto: TipoDesconto | null;
  valor_desconto: number | null;
  mensagem: string;
};

// Tipo para cupom com estatísticas expandidas (para admin)
export type CupomComEstatisticas = Cupom & {
  usos_hoje: number;
  usos_semana: number;
  usos_mes: number;
  ultimos_usos: CupomUso[];
};

// Helper para calcular desconto
export function calcularDesconto(
  tipo: TipoDesconto,
  valorDesconto: number,
  valorOriginal: number
): { valorFinal: number; descontoAplicado: number; minutosExtras: number } {
  switch (tipo) {
    case "porcentagem":
      const desconto = (valorOriginal * valorDesconto) / 100;
      return {
        valorFinal: Math.max(0, valorOriginal - desconto),
        descontoAplicado: desconto,
        minutosExtras: 0,
      };

    case "valor_fixo":
      return {
        valorFinal: Math.max(0, valorOriginal - valorDesconto),
        descontoAplicado: Math.min(valorDesconto, valorOriginal),
        minutosExtras: 0,
      };

    case "minutos_extras":
      return {
        valorFinal: valorOriginal,
        descontoAplicado: 0,
        minutosExtras: valorDesconto,
      };

    default:
      return {
        valorFinal: valorOriginal,
        descontoAplicado: 0,
        minutosExtras: 0,
      };
  }
}

// Helper para formatar tipo de desconto para exibição
export function formatarTipoDesconto(
  tipo: TipoDesconto,
  valor: number
): string {
  switch (tipo) {
    case "porcentagem":
      return `${valor}% OFF`;
    case "valor_fixo":
      return `R$ ${valor.toFixed(2)} OFF`;
    case "minutos_extras":
      return `+${valor} minutos`;
    default:
      return "";
  }
}

// Cores para origem (para UI)
export const CORES_ORIGEM: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  instagram: {
    bg: "bg-gradient-to-r from-purple-500 to-pink-500",
    text: "text-white",
    icon: "📸",
  },
  tiktok: { bg: "bg-black", text: "text-white", icon: "🎵" },
  facebook: { bg: "bg-blue-600", text: "text-white", icon: "👍" },
  google: { bg: "bg-red-500", text: "text-white", icon: "🔍" },
  influencer: { bg: "bg-yellow-500", text: "text-black", icon: "⭐" },
  indicacao: { bg: "bg-green-500", text: "text-white", icon: "🤝" },
};

// Lista de origens para select
export const ORIGENS_CUPOM = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "facebook", label: "Facebook", icon: "👍" },
  { value: "google", label: "Google", icon: "🔍" },
  { value: "influencer", label: "Influencer", icon: "⭐" },
  { value: "indicacao", label: "Indicação", icon: "🤝" },
];
