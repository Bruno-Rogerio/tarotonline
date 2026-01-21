"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export type Banner = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string;
  link_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
};

interface BannerCarouselProps {
  autoPlayInterval?: number; // em milissegundos
}

export default function BannerCarousel({
  autoPlayInterval = 5000,
}: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar banners ativos
  useEffect(() => {
    async function carregarBanners() {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .limit(5);

      if (!error && data) {
        setBanners(data);
      }
      setLoading(false);
    }

    carregarBanners();
  }, []);

  // Função para ir ao próximo slide
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Função para ir ao slide anterior
  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Ir para um slide específico
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // AutoPlay
  useEffect(() => {
    if (banners.length <= 1 || isHovered) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [banners.length, isHovered, autoPlayInterval, nextSlide]);

  // Não renderizar se não há banners ou está carregando
  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto h-48 md:h-64 lg:h-80 bg-white/5 rounded-2xl animate-pulse" />
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  // Wrapper do conteúdo do banner (com ou sem link)
  const BannerContent = () => (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      {/* Imagem */}
      <img
        src={currentBanner.imagem_url}
        alt={currentBanner.titulo}
        className="w-full h-full object-cover transition-transform duration-500"
      />

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Texto do banner */}
      {(currentBanner.titulo || currentBanner.descricao) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          {currentBanner.titulo && (
            <h3 className="text-white text-lg md:text-2xl font-bold mb-1 drop-shadow-lg">
              {currentBanner.titulo}
            </h3>
          )}
          {currentBanner.descricao && (
            <p className="text-white/90 text-sm md:text-base drop-shadow-lg line-clamp-2">
              {currentBanner.descricao}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 my-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-48 md:h-64 lg:h-80">
        {/* Banner principal */}
        {currentBanner.link_url ? (
          <Link
            href={currentBanner.link_url}
            className="block w-full h-full cursor-pointer group"
          >
            <BannerContent />
            {/* Indicador de link */}
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm flex items-center gap-1">
                <span>Saiba mais</span>
                <span>→</span>
              </span>
            </div>
          </Link>
        ) : (
          <BannerContent />
        )}

        {/* Setas de navegação */}
        {banners.length > 1 && (
          <>
            {/* Seta esquerda */}
            <button
              onClick={(e) => {
                e.preventDefault();
                prevSlide();
              }}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
              style={{ opacity: isHovered ? 1 : 0 }}
              aria-label="Banner anterior"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Seta direita */}
            <button
              onClick={(e) => {
                e.preventDefault();
                nextSlide();
              }}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
              style={{ opacity: isHovered ? 1 : 0 }}
              aria-label="Próximo banner"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Indicadores (bolinhas) */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-white scale-110"
                    : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
