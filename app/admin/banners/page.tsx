"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Banner = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string;
  link_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);

  useEffect(() => {
    verificarAdmin();
  }, []);

  async function verificarAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("tipo")
      .eq("id", user.id)
      .single();

    if (usuario?.tipo !== "admin") {
      alert("Acesso negado. Apenas admins podem acessar.");
      router.push("/");
      return;
    }

    carregarBanners();
  }

  async function carregarBanners() {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("ordem", { ascending: true });

    if (!error && data) {
      setBanners(data);
    }
    setLoading(false);
  }

  function abrirModalNovo() {
    setEditando(null);
    setTitulo("");
    setDescricao("");
    setLinkUrl("");
    setImagemPreview(null);
    setArquivoImagem(null);
    setMostrarModal(true);
  }

  function abrirModalEditar(banner: Banner) {
    setEditando(banner);
    setTitulo(banner.titulo);
    setDescricao(banner.descricao || "");
    setLinkUrl(banner.link_url || "");
    setImagemPreview(banner.imagem_url);
    setArquivoImagem(null);
    setMostrarModal(true);
  }

  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens.");
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    setArquivoImagem(file);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagemPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadImagem(file: File): Promise<string | null> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error } = await supabase.storage
      .from("banners")
      .upload(filePath, file);

    if (error) {
      console.error("Erro no upload:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("banners").getPublicUrl(filePath);

    return publicUrl;
  }

  async function salvarBanner() {
    if (!titulo.trim()) {
      alert("O título é obrigatório.");
      return;
    }

    if (!editando && !arquivoImagem) {
      alert("Selecione uma imagem para o banner.");
      return;
    }

    setUploading(true);

    try {
      let imagemUrl = editando?.imagem_url || "";

      // Upload da nova imagem se houver
      if (arquivoImagem) {
        const url = await uploadImagem(arquivoImagem);
        if (!url) {
          alert("Erro ao fazer upload da imagem.");
          setUploading(false);
          return;
        }
        imagemUrl = url;

        // Deletar imagem antiga se estiver editando
        if (editando?.imagem_url) {
          const oldPath = editando.imagem_url.split("/banners/")[1];
          if (oldPath) {
            await supabase.storage
              .from("banners")
              .remove([`banners/${oldPath}`]);
          }
        }
      }

      if (editando) {
        // Atualizar banner existente
        const { error } = await supabase
          .from("banners")
          .update({
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            link_url: linkUrl.trim() || null,
            imagem_url: imagemUrl,
          })
          .eq("id", editando.id);

        if (error) throw error;
      } else {
        // Criar novo banner
        const novaOrdem =
          banners.length > 0 ? Math.max(...banners.map((b) => b.ordem)) + 1 : 1;

        const { error } = await supabase.from("banners").insert({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          link_url: linkUrl.trim() || null,
          imagem_url: imagemUrl,
          ordem: novaOrdem,
          ativo: true,
        });

        if (error) throw error;
      }

      setMostrarModal(false);
      carregarBanners();
    } catch (error) {
      console.error("Erro ao salvar banner:", error);
      alert("Erro ao salvar banner.");
    }

    setUploading(false);
  }

  async function toggleAtivo(banner: Banner) {
    const { error } = await supabase
      .from("banners")
      .update({ ativo: !banner.ativo })
      .eq("id", banner.id);

    if (!error) {
      carregarBanners();
    }
  }

  async function deletarBanner(banner: Banner) {
    if (
      !confirm(`Tem certeza que deseja excluir o banner "${banner.titulo}"?`)
    ) {
      return;
    }

    // Deletar imagem do storage
    const imagePath = banner.imagem_url.split("/banners/")[1];
    if (imagePath) {
      await supabase.storage.from("banners").remove([`banners/${imagePath}`]);
    }

    // Deletar do banco
    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", banner.id);

    if (!error) {
      carregarBanners();
    }
  }

  async function moverBanner(banner: Banner, direcao: "up" | "down") {
    const index = banners.findIndex((b) => b.id === banner.id);
    if (
      (direcao === "up" && index === 0) ||
      (direcao === "down" && index === banners.length - 1)
    ) {
      return;
    }

    const outroIndex = direcao === "up" ? index - 1 : index + 1;
    const outroBanner = banners[outroIndex];

    // Trocar ordens
    await supabase
      .from("banners")
      .update({ ordem: outroBanner.ordem })
      .eq("id", banner.id);

    await supabase
      .from("banners")
      .update({ ordem: banner.ordem })
      .eq("id", outroBanner.id);

    carregarBanners();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 group">
            <span className="text-2xl">←</span>
            <span className="text-lg font-bold text-white">
              Voltar ao Admin
            </span>
          </Link>
          <h1 className="text-xl font-bold text-white">Gerenciar Banners</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Botão adicionar */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-purple-200/70">
            {banners.length}/5 banners cadastrados
          </p>
          <button
            onClick={abrirModalNovo}
            disabled={banners.length >= 5}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>Novo Banner</span>
          </button>
        </div>

        {/* Lista de banners */}
        {banners.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Nenhum banner cadastrado
            </h3>
            <p className="text-purple-200/70 mb-6">
              Adicione seu primeiro banner para aparecer na home
            </p>
            <button
              onClick={abrirModalNovo}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl"
            >
              Criar primeiro banner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden ${
                  !banner.ativo ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Imagem */}
                  <div className="md:w-64 h-40 md:h-auto flex-shrink-0">
                    <img
                      src={banner.imagem_url}
                      alt={banner.titulo}
                      className="w-full h-full object-contain bg-black/20"
                    />
                  </div>

                  {/* Informações */}
                  <div className="flex-1 p-4 md:p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-300/60 text-sm">
                            #{index + 1}
                          </span>
                          {!banner.ativo && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                              Inativo
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {banner.titulo}
                        </h3>
                      </div>
                    </div>

                    {banner.descricao && (
                      <p className="text-purple-200/70 text-sm mb-2 line-clamp-2">
                        {banner.descricao}
                      </p>
                    )}

                    {banner.link_url && (
                      <p className="text-purple-400 text-sm truncate mb-4">
                        🔗 {banner.link_url}
                      </p>
                    )}

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Mover */}
                      <button
                        onClick={() => moverBanner(banner, "up")}
                        disabled={index === 0}
                        className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg text-white transition-all"
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moverBanner(banner, "down")}
                        disabled={index === banners.length - 1}
                        className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg text-white transition-all"
                        title="Mover para baixo"
                      >
                        ↓
                      </button>

                      {/* Toggle ativo */}
                      <button
                        onClick={() => toggleAtivo(banner)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          banner.ativo
                            ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            : "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                        }`}
                      >
                        {banner.ativo ? "✓ Ativo" : "○ Inativo"}
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => abrirModalEditar(banner)}
                        className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-all"
                      >
                        ✏️ Editar
                      </button>

                      {/* Deletar */}
                      <button
                        onClick={() => deletarBanner(banner)}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-all"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de criação/edição */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl border border-white/20 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editando ? "Editar Banner" : "Novo Banner"}
                </h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Upload de imagem */}
              <div className="mb-6">
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Imagem do Banner *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-48 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-all overflow-hidden"
                >
                  {imagemPreview ? (
                    <img
                      src={imagemPreview}
                      alt="Preview"
                      className="w-full h-full object-contain bg-black/20"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-purple-200/50">
                      <span className="text-4xl mb-2">📷</span>
                      <span>Clique para selecionar</span>
                      <span className="text-xs mt-1">
                        Recomendado: 1200x400px
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagemChange}
                  className="hidden"
                />
              </div>

              {/* Título */}
              <div className="mb-4">
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Promoção de Verão"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Descrição */}
              <div className="mb-4">
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do banner"
                  rows={2}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Link */}
              <div className="mb-6">
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Link de redirecionamento (opcional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com/promocao"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                />
                <p className="text-purple-200/50 text-xs mt-1">
                  Se preenchido, o banner será clicável
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarBanner}
                  disabled={uploading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl transition-all"
                >
                  {uploading
                    ? "Salvando..."
                    : editando
                      ? "Atualizar"
                      : "Criar Banner"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
