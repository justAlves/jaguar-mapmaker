<p align="center">
  <img src="public/jaguar-mark.svg" width="120" alt="Logo de Jaguar" />
</p>

<h1 align="center">Jaguar</h1>
<p align="center"><strong>Mapas de rol, directo a tu VTT favorito.</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.pt-BR.md">Português</a> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Licencia MIT"></a>
</p>

---

Pinta un mapa en cuadrícula con tu propio arte, coloca objetos, exporta un PNG limpio del tamaño exacto de tu cuadrícula. Eso es todo — Jaguar no intenta ser un VTT en vivo, solo pone un mapa en la mesa rápido.

## Por qué Jaguar

- **Tu arte, no un tileset integrado.** Importa los PNGs de suelo/pared/objetos que ya tienes. Sin reglas de bitmask que cumplir, sin formato de autotile al cual convertir.
- **Paredes que realmente parecen paredes.** Se ajustan al borde de la celda en vez de llenar todo el tile, así que una sala se ve como una sala en vez de un bloque de ladrillos. El borde se detecta automáticamente según dónde estés pintando, o puedes fijarlo manualmente.
- **Objetos que de verdad puedes posar.** Controles de esquina/borde/rotación directo en el canvas, estilo Photoshop — mantén **Alt** para escalar proporcionalmente.
- **Son solo archivos.** Un proyecto es una carpeta con un `project.json` y un directorio `assets/`. Sin cuenta, sin nube, nada que no puedas respaldar con un copiar y pegar.

Además de eso: una biblioteca de recursos con carpetas y buscador, guardado automático, proyectos recientes con miniaturas en vivo, tema claro/oscuro/sistema, y English/Português/Español — lo que ya esperarías de cualquier editor decente, presente y sin estorbar.

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `F` / `W` / `X` / `P` / `H` | Pintar suelo / Pintar pared / Borrar / Objetos / Mover |
| `R` | Cambia el modo de arista de la pared (al pintar paredes) |
| `G` | Muestra/oculta la cuadrícula |
| `Ctrl+Z` / `Ctrl+Y` | Deshacer / Rehacer |
| `Ctrl+S` | Guardar |
| `Ctrl+D` | Duplicar objeto seleccionado |
| `Delete` | Eliminar objeto seleccionado |
| Flechas (+ `Shift`) | Mover el objeto seleccionado |
| `Escape` | Deseleccionar |

## Cómo empezar

### Requisitos previos

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- Dependencias de compilación de la plataforma para Tauri — consulta la [guía oficial de requisitos previos](https://v2.tauri.app/start/prerequisites/) (en Linux esto significa `webkit2gtk`, `libsoup3` y similares)

### Ejecutar en desarrollo

```bash
npm install
npm run tauri dev
```

### Generar un build de release

```bash
npm run tauri build
```

La app empaquetada (y el instalador, cuando corresponda) queda en `src-tauri/target/release/bundle/`.

## Estructura del proyecto

```
src/                Frontend en React + TypeScript
  components/        Componentes de UI (editor, canvas, paneles, diálogos)
  store/              Stores de Zustand (estado del mapa/editor, configuración de la app)
  lib/                E/S de proyecto, exportación PNG, autoguardado, tema, etc.
  i18n/               Diccionarios de traducción (en / pt / es)
src-tauri/           Backend en Rust (shell de Tauri, capabilities, íconos)
```

Los proyectos son carpetas normales en disco: un `project.json` que describe la cuadrícula, las celdas pintadas y los objetos, más una subcarpeta `assets/` con las imágenes importadas. Nada queda oculto en una base de datos propia de la app.

## Fuera de alcance (por ahora)

Jaguar es, a propósito, una herramienta de *creación* de mapas, no un VTT en vivo:

- Sin cuentas, sincronización en la nube ni colaboración en tiempo real.
- Sin conexión automática de paredes vía autotile/bitmask (la pintura por arista ya cubre la mayoría de los casos sin eso).
- Sin niebla de guerra, iluminación dinámica u otras funciones de sesión en vivo — exporta un PNG y ejecuta tu sesión en el VTT que prefieras.

## Contribuir

Las contribuciones son bienvenidas — consulta [CONTRIBUTING.md](CONTRIBUTING.md) para saber cómo configurar el entorno, y [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) para las pautas de la comunidad. ¿Encontraste un problema de seguridad? Sigue [SECURITY.md](SECURITY.md) en lugar de abrir un issue público.

## Licencia

MIT — consulta [LICENSE](LICENSE).
