"use client";

import * as React from "react";
import {
  CakeIcon,
  CameraIcon,
  CarIcon,
  Flower2Icon,
  MusicIcon,
  PaletteIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
  VideoIcon,
} from "lucide-react";

import { categoryKey, isHttpUrl } from "@/components/vendors/vendor-model";
import { cn } from "@/lib/utils";

/** Fincas: casa con puerta en arco y un ciprés, a trazo fino. */
function FincaIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 23 18 10l14 13" />
      <path d="M7 21v19h22V21" />
      <path d="M14 40V30a4 4 0 0 1 8 0v10" />
      <path d="M2 40h44" />
      <path d="M39 40V22" />
      <path d="M39 12c-4 3-5 8-5 13 0 3 2 5 5 5s5-2 5-5c0-5-1-10-5-13Z" />
    </svg>
  );
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  catering: UtensilsCrossedIcon,
  fotografo: CameraIcon,
  video: VideoIcon,
  musica: MusicIcon,
  flores: Flower2Icon,
  pastel: CakeIcon,
  transporte: CarIcon,
  decoracion: PaletteIcon,
};

// Fondo lila suave o salvia según la categoría; el trazo siempre verde oscuro.
const SAGE_CATEGORIES = new Set(["catering", "flores", "transporte", "pastel"]);

/** Marcador de posición de marca: icono de trazo fino por categoría. */
export function VendorPlaceholder({
  category,
  className,
  muted = false,
}: {
  category: string;
  className?: string;
  muted?: boolean;
}) {
  const key = categoryKey(category);
  const sage = SAGE_CATEGORIES.has(key);
  const iconClass = "size-16 text-[#4E6A5A] sm:size-[4.5rem]";
  const Icon = CATEGORY_ICON[key] ?? SparklesIcon;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        sage ? "bg-[#D2D7CB]" : "bg-[#ECE6F4]",
        className
      )}
    >
      <span
        className={cn(
          "absolute size-36 rounded-full border border-dashed",
          sage ? "border-[#4E6A5A]/25" : "border-[#927AAC]/40"
        )}
      />
      <span className={cn("relative", muted && "opacity-70")}>
        {key === "finca" ? (
          <FincaIllustration className={iconClass} />
        ) : (
          <Icon className={iconClass} strokeWidth={1} />
        )}
      </span>
    </div>
  );
}

/**
 * Foto de la opción con zoom suave al pasar el ratón por la tarjeta
 * (el grupo `group/card` lo define la tarjeta). Solo la imagen escala, dentro
 * de un contenedor con overflow-hidden: nada de will-change para no
 * emborronar el texto. Si no hay foto o falla la carga, se muestra el marcador.
 */
export function VendorPhoto({
  photoUrl,
  name,
  category,
}: {
  photoUrl?: string;
  name: string;
  category: string;
}) {
  const url = photoUrl?.trim() ?? "";
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const showImage = isHttpUrl(url) && failedUrl !== url;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE6F4]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- dominios remotos libres: no se puede usar next/image
        <img
          src={url}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
        />
      ) : (
        <VendorPlaceholder category={category} />
      )}
    </div>
  );
}
