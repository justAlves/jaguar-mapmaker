# Política de Seguridad

*[English](SECURITY.md) · [Português](SECURITY.pt-BR.md)*

## Versiones compatibles

Jaguar todavía no tiene releases con versión marcada; las correcciones de seguridad solo se aplican al código más reciente de la rama predeterminada. Cuando existan releases versionados, esta sección se actualizará para reflejar qué versiones reciben parches.

## Reportar una vulnerabilidad

Por favor, **no** abras un issue público en GitHub para vulnerabilidades de seguridad.

En su lugar, usa la función de reporte privado de vulnerabilidades de GitHub para este repositorio (pestaña **Security** → **Report a vulnerability**). Esto abre una conversación privada con los mantenedores sin revelar detalles públicamente antes de que exista una corrección.

Al reportar, incluye si es posible:

- Una descripción del problema y su impacto potencial
- Pasos para reproducirlo (o una prueba de concepto, si aplica)
- La(s) plataforma(s) afectada(s) (Windows/macOS/Linux), si es relevante

Haremos lo posible por confirmar la recepción rápidamente y mantenerte informado mientras se investiga y corrige el problema.

## Alcance y contexto

Jaguar es una aplicación de escritorio local-first construida con Tauri:

- No tiene backend, no tiene cuentas de usuario, y no transmite ningún dato por la red. No recopila telemetría ni analíticas.
- Lee/escribe archivos únicamente dentro de las carpetas que eliges explícitamente (mediante diálogos nativos de archivo/carpeta) para tus proyectos y los recursos importados en ellos.
- La principal superficie de ataque relevante es, por lo tanto, las capabilities del sistema de archivos del shell de Tauri y cualquier dependencia de terceros (paquetes npm/crates de Cargo) — los reportes de vulnerabilidades en dependencias también son bienvenidos, incluso si el camino práctico de explotación no está claro.
