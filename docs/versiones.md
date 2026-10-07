# Versiones guardadas

Puntos a los que se puede volver si un cambio posterior no convence.

## primer-test

Estado aprobado por la clienta antes del rediseño UX del dashboard y del Resumen.

| Qué | Dónde |
|---|---|
| Código | rama `primer-test` en GitHub (commit `b63e4bf`) |
| Imagen desplegada | `us-central1-docker.pkg.dev/tubodadiy-2251c/tubodadiy/app:primer-test` (`sha256:7454af83cf7a…8ac7`) |
| Revisión de Cloud Run | `tubodadiy-00012-bfw` |
| Reglas de Firestore | ruleset `1620cf4f-70e8-46d1-a4be-05a7ad7cf0da` |

Volver a esta versión ("haz revert hasta primer test"):

1. Código: en `claude/wedding-planning-app-toclij`, `git checkout primer-test -- .` y borrar los
   archivos añadidos después (`git diff --name-only --diff-filter=A primer-test HEAD`), y hacer un
   commit nuevo "revert: volver a primer-test". No se reescribe el historial.
2. Web: redesplegar Cloud Run con la imagen `app:primer-test` (no hace falta recompilar).
3. Datos: los datos de Firestore no se versionan; lo que se haya creado después se mantiene.
