import Link from "next/link";
import { HeartIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F4F1EB] px-4 py-16 text-center">
      <HeartIcon className="size-8 fill-[#DECDF1] text-[#907AB2]" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl font-semibold text-[#26413C]">No encontramos esta página</h1>
      <p className="mt-2 max-w-sm text-[#586C64]">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#927AAC] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EB]"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
