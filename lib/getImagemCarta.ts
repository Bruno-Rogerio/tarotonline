// lib/getImagemCarta.ts

// Substitua pela URL do seu projeto Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const BUCKET_NAME = "cartas-tarot";

// Mapeamento: Nome da carta no sistema → Nome do arquivo no Supabase
const MAPA_CARTAS: Record<string, string> = {
  "O Louco": "o_louco.jpeg",
  "O Mago": "o_mago.jpeg",
  "A Sacerdotisa": "a_alta_sacerdotisa.jpeg",
  "A Imperatriz": "a_imperatriz.jpeg",
  "O Imperador": "o_imperador.jpeg",
  "O Hierofante": "o_hierofante.jpeg",
  "Os Enamorados": "os_enamorados.jpeg",
  "O Carro": "o_carro.jpeg",
  "A Força": "a_forca.jpeg",
  "O Eremita": "o_eremita.jpeg",
  "A Roda da Fortuna": "a_roda_da_fortuna.jpeg",
  "A Justiça": "a_justica.jpeg",
  "O Enforcado": "o_enforcado.jpeg",
  "A Morte": "a_morte.jpeg",
  "A Temperança": "a_temperanca.jpeg",
  "O Diabo": "o_diabo.jpeg",
  "A Torre": "a_torre.jpeg",
  "A Estrela": "a_estrela.jpeg",
  "A Lua": "a_lua.jpeg",
  "O Sol": "o_sol.jpeg",
  "O Julgamento": "o_julgamento.jpeg",
  "O Mundo": "o_mundo.jpeg",
};

/**
 * Retorna a URL da imagem da carta no Supabase Storage
 * @param nomeCarta - Nome da carta (ex: "O Louco", "A Imperatriz")
 * @returns URL completa da imagem ou null se não encontrar
 */
export function getImagemCarta(nomeCarta: string): string | null {
  const nomeArquivo = MAPA_CARTAS[nomeCarta];

  if (!nomeArquivo) {
    console.warn(`Carta não encontrada no mapa: ${nomeCarta}`);
    return null;
  }

  // Construir URL do Supabase Storage
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${nomeArquivo}`;
}
