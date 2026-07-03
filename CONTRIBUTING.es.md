# Contribuir a Jaguar

*[English](CONTRIBUTING.md) · [Português](CONTRIBUTING.pt-BR.md)*

¡Gracias por considerar contribuir! Jaguar es una herramienta pequeña y enfocada, así que "esto encaja con el propósito de la app" pesa más que "el código está pulido al máximo" — siéntete libre de abrir un issue para discutir una función antes de invertir tiempo en un PR grande.

## Preparar el entorno

Vas a necesitar:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- Las dependencias de compilación de la plataforma para Tauri — consulta la [guía oficial de requisitos previos](https://v2.tauri.app/start/prerequisites/)

Luego:

```bash
npm install
npm run tauri dev
```

Esto inicia la app con hot-reload en el frontend (los cambios en React/TypeScript se aplican al instante) y recompilación automática del lado de Rust (los cambios en `src-tauri/` disparan una recompilación + reinicio de la app).

## Antes de abrir un PR

- Ejecuta `npm run build` — esto corre el compilador de TypeScript en modo estricto seguido del build de producción de Vite. No hay un paso de lint separado configurado, así que esta es la verificación básica.
- Si modificaste código Rust, ejecuta `cargo check` dentro de `src-tauri/`.
- **Prueba el cambio de verdad** en la app en ejecución. Este proyecto todavía no tiene una suite de pruebas automatizadas, así que la verificación manual (abrir un proyecto, hacer la acción, confirmar que funciona) es la principal red de seguridad. Menciona qué probaste en la descripción del PR.
- Mantén los PRs enfocados en un solo cambio. Las refactorizaciones "de paso" mezcladas con una función dificultan mucho la revisión.

## Estilo de código

- El modo estricto de TypeScript está activado; mantenlo así (evita escapes con `any` sin una buena razón).
- Sigue los patrones ya existentes: Zustand para el estado, CSS puro con los tokens de diseño en `src/App.css` (sin CSS-in-JS, sin framework de utilidades), componentes funcionales de React con hooks.
- Las nuevas cadenas de texto visibles para el usuario deben pasar por el sistema de i18n (`useT()` + `src/i18n/translations.ts`), completadas en los tres idiomas (`en`, `pt`, `es`) — TypeScript hará fallar el build si falta una clave en algún diccionario.
- Los comentarios deben explicar el *por qué*, no el *qué* — revisa el código existente como referencia de tono.

## Reportar errores / sugerir funciones

Abre un issue en GitHub. Para errores, incluye tu sistema operativo, qué esperabas, qué sucedió en realidad, y los pasos para reproducirlo. Para funciones nuevas, una breve descripción del caso de uso es más útil que un diseño completo — podemos iterar juntos en el enfoque.

## Problemas de seguridad

Por favor, no abras un issue público para vulnerabilidades de seguridad — consulta [SECURITY.md](SECURITY.md) en su lugar.
