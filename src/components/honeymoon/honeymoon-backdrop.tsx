import {
  BananaLeaf,
  Cloud,
  Hibiscus,
  Monstera,
  Mountains,
  Palm,
  PlaneTrail,
  Stars,
  Sun,
  Waves,
} from "@/components/honeymoon/motifs";

// Fondo fijo de la Luna de miel: sustituye al AppBackdrop solo en esta ruta (lo decide
// `AppFrame`). Cielo en degradado (de día, azul agua y blanco roto; de noche, mar profundo
// con luna y estrellas), sol, nubes, un avión con su estela punteada, montañas, mar con
// olas y palmeras y hojas en los bordes. Va `fixed` a pantalla completa, detrás del
// contenido: la página se desplaza por encima. Todo es decoración (aria-hidden) y las
// tarjetas de la página son opacas, así que ningún texto se apoya en estos dibujos.
// En móvil se reduce a lo esencial.

export function HoneymoonBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-testid="honeymoon-backdrop"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      style={{
        background:
          "linear-gradient(to bottom, var(--hm-sky-top) 0%, var(--hm-sky-mid) 48%, var(--hm-sky-bottom) 100%)",
      }}
    >
      <Stars className="absolute inset-x-0 top-0 h-48 w-full sm:h-64" />

      {/* Cielo */}
      <Sun className="absolute -right-10 top-16 size-40 sm:right-[7%] sm:top-12 sm:size-60" />
      <Cloud className="hm-drift absolute left-[6%] top-[22%] w-24 sm:left-[14%] sm:w-36" />
      <Cloud className="hm-drift absolute right-[16%] top-[34%] hidden w-28 sm:block" style={{ animationDelay: "-9s" }} />
      <Cloud className="hm-drift absolute left-[48%] top-[12%] hidden w-20 md:block" style={{ animationDelay: "-4s" }} />
      <PlaneTrail className="hm-bob absolute right-[2%] top-[9vh] w-56 sm:left-[38%] sm:right-auto sm:top-[5vh] sm:w-80" />

      {/* Hojas de las esquinas */}
      <Monstera className="absolute -left-8 top-[40%] hidden size-28 rotate-[24deg] opacity-80 sm:block" />
      <BananaLeaf className="absolute -right-6 top-[44%] hidden h-40 w-24 -rotate-[28deg] opacity-80 md:block" />

      {/* Paisaje: montañas, mar y palmeras */}
      <Mountains className="absolute inset-x-0 bottom-[7vh] h-[34vh] w-full" />
      <Waves className="absolute inset-x-0 bottom-0 h-[16vh] w-full" />
      <Palm className="hm-sway absolute -left-10 bottom-[2vh] h-[46vh] sm:left-[1%] sm:h-[58vh]" />
      <Palm className="hm-sway absolute -right-16 bottom-[1vh] h-[36vh] -scale-x-100 sm:right-[3%] sm:h-[48vh]" />
      <Palm className="hm-sway absolute bottom-[4vh] right-[16%] hidden h-[30vh] md:block" style={{ animationDelay: "-3s" }} />
      <Hibiscus className="absolute bottom-[3vh] left-[16%] hidden size-12 sm:block" />
      <Hibiscus className="absolute bottom-[5vh] right-[30%] hidden size-10 lg:block" />
    </div>
  );
}
