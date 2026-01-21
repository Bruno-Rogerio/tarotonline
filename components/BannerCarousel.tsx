"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  autoPlayInterval?: number;
}

export default function BannerCarousel({
  autoPlayInterval = 5000,
}: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Touch/Swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Swipe handlers para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        nextSlide(); // Swipe left = próximo
      } else {
        prevSlide(); // Swipe right = anterior
      }
    }
  };

  // AutoPlay
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, autoPlayInterval, nextSlide]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full px-4 my-6 md:my-8">
        <div className="w-full max-w-5xl mx-auto h-40 sm:h-48 md:h-64 lg:h-80 bg-white/5 rounded-xl md:rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const BannerContent = () => (
    <div className="relative w-full h-full overflow-hidden rounded-xl md:rounded-2xl">
      {/* Imagem */}
      <img
        src={currentBanner.imagem_url}
        alt={currentBanner.titulo}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Texto do banner */}
      {(currentBanner.titulo || currentBanner.descricao) && (
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
          {currentBanner.titulo && (
            <h3 className="text-white text-base sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-1 drop-shadow-lg line-clamp-1">
              {currentBanner.titulo}
            </h3>
          )}
          {currentBanner.descricao && (
            <p className="text-white/90 text-xs sm:text-sm md:text-base drop-shadow-lg line-clamp-1 sm:line-clamp-2">
              {currentBanner.descricao}
            </p>
          )}
        </div>
      )}

      {/* Indicador de link (só no desktop) */}
      {currentBanner.link_url && (
        <div className="hidden md:flex absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-sm flex items-center gap-1">
            Saiba mais →
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full px-4 my-6 md:my-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full max-w-5xl mx-auto h-40 sm:h-48 md:h-64 lg:h-80">
        {/* Banner principal */}
        {currentBanner.link_url ? (
          <Link
            href={currentBanner.link_url}
            className="block w-full h-full cursor-pointer group"
          >
            <BannerContent />
          </Link>
        ) : (
          <BannerContent />
        )}

        {/* Setas de navegação - visíveis sempre no mobile, hover no desktop */}
        {banners.length > 1 && (
          <>
            {/* Seta esquerda */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 
                         w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 
                         bg-black/40 active:bg-black/60 md:hover:bg-black/60 
                         backdrop-blur-sm rounded-full 
                         flex items-center justify-center text-white 
                         transition-all
                         opacity-70 md:opacity-0 md:group-hover:opacity-100 md:hover:opacity-100"
              aria-label="Banner anterior"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Seta direita */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 
                         w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 
                         bg-black/40 active:bg-black/60 md:hover:bg-black/60 
                         backdrop-blur-sm rounded-full 
                         flex items-center justify-center text-white 
                         transition-all
                         opacity-70 md:opacity-0 md:group-hover:opacity-100 md:hover:opacity-100"
              aria-label="Próximo banner"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Indicadores (bolinhas) */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`rounded-full transition-all duration-300 
                           ${
                             index === currentIndex
                               ? "w-6 sm:w-7 md:w-8 h-2 sm:h-2.5 bg-white"
                               : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/50 active:bg-white/80"
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
