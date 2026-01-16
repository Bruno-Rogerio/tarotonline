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
