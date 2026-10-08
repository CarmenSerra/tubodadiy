"use client";

// Sustituye al layout raíz cuando este falla: no hereda estilos globales, por
// eso los estilos van en línea.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1rem",
          textAlign: "center",
          background: "#F4F1EB",
          color: "#26413C",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Algo no ha ido bien — tubodadiy</title>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.875rem", margin: 0 }}>Algo no ha ido bien</h1>
        <p style={{ maxWidth: "24rem", color: "#586C64" }}>
          Ha ocurrido un error inesperado. Inténtalo de nuevo y, si sigue pasando, recarga la página.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: "1.5rem",
            height: "2.75rem",
            padding: "0 1.5rem",
            border: 0,
            borderRadius: "9999px",
            background: "#927AAC",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Volver a intentarlo
        </button>
      </body>
    </html>
  );
}
