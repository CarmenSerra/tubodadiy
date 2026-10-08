const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/missing-email": "Escribe tu correo electrónico.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
  "auth/user-not-found": "No existe ninguna cuenta con ese correo electrónico.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/invalid-credential": "Correo electrónico o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo electrónico.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
  "auth/network-request-failed": "Error de conexión. Comprueba tu red e inténtalo de nuevo.",
  "auth/operation-not-allowed": "El acceso con correo electrónico y contraseña no está activado.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.",
  "auth/user-token-expired": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "auth/invalid-api-key": "La configuración de acceso no es válida. Avisa a quien administre la aplicación.",
  "permission-denied": "No tienes permiso para hacer esto.",
  unavailable: "El servicio no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.",
  "deadline-exceeded": "La operación ha tardado demasiado. Inténtalo de nuevo.",
};

/**
 * Mensaje en español para un error de Firebase. Nunca se devuelve el texto
 * original del SDK (viene en inglés): lo no reconocido cae en un mensaje
 * genérico.
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (MESSAGES[code]) return MESSAGES[code];
    // Los códigos de Firestore llegan a veces como "firestore/unavailable".
    const bare = code.replace(/^firestore\//, "");
    if (MESSAGES[bare]) return MESSAGES[bare];
  }
  return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
}
