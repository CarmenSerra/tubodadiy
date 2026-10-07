import { redirect } from "next/navigation";

// La gestión del equipo vive ahora en el modal "Equipo" de la home.
// Se mantiene la ruta para que los enlaces antiguos no den 404.
export default function MembersPage() {
  redirect("/dashboard");
}
