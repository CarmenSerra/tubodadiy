const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "El email no es válido.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
  "auth/user-not-found": "No existe ninguna cuenta con ese email.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
  "auth/network-request-failed": "Error de conexión. Comprueba tu red e inténtalo de nuevo.",
};

export function getFirebaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (MESSAGES[code]) return MESSAGES[code];
  }
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error inesperado.";
}
