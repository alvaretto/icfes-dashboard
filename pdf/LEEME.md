# Versión PDF del dashboard (vista «Todo»)

Exporta [la vista «Todo»](https://alvaretto.github.io/icfes-dashboard/#todo) del dashboard a un **PDF para imprimir y circular**: tamaño Carta, unas 90 páginas, con portada, índice con número de página y enlaces, marcadores, encabezado y pie con «Página X de Y» y el commit publicado. Los estados que en el sitio quedan ocultos tras pestañas salen todos, en mosaico, y las 39 gráficas (más 21 vistas de pestañas, 60 en total) se imprimen como imágenes nítidas.

El exportador lee el **sitio publicado** (`origin/main` en GitHub Pages), no el `index.html` local, y **no modifica el sitio**: su CSS de impresión se inyecta al generar. Lo que se ve en el navegador es lo que sale en el PDF, cifra por cifra.

> **Privacidad.** El PDF contiene los mismos datos nominales que el sitio: el listado por estudiante (apartado 8), la identificación nominal (módulo IX) y las trayectorias con nombre (módulos V y VI). De grado 10 solo hay agregados (D31), como en el sitio. **El PDF no se versiona** en este repositorio público (`.gitignore`): se genera localmente y se distribuye aparte.

## Uso

```bash
cd pdf
npm ci               # una vez: instala playwright-core
git fetch origin     # para que el commit de la portada sea el publicado
npm run inventario   # opcional: qué secciones, pestañas y gráficas muestra hoy #todo (inventario.json)
npm run pdf          # genera Informe-ICFES-2026-<fecha>.pdf (~1 minuto)
npm run verificar    # comprueba el PDF contra el sitio; sale con código 1 si algo falla
```

**Requisitos:** Node 20 o posterior; el Chromium de Playwright (`npx playwright install chromium` si no está en `~/.cache/ms-playwright`); `poppler-utils` (`pdfinfo`, `pdffonts`, `pdfimages`, `pdftotext`); `qpdf`; y `exiftool` para los metadatos (si no está, el PDF sale sin autor ni asunto). El commit y su fecha salen de `origin/main`; se pueden forzar con `COMMIT=… COMMIT_FECHA=AAAA-MM-DD npm run pdf`.

**Cuándo regenerarlo:** cada vez que cambie el sitio publicado. Por ejemplo, después de `Saber-ICFES-2026/scripts/exportar_dashboard.py --inyectar` y su push (módulo ★ Saber 11° 2026), o después de cambiar los módulos de simulacros.

## Archivos

| Archivo | Qué hace |
|---|---|
| `exportar_pdf.mjs` | Genera el PDF (pasos abajo) y escribe `indice.json` y `reporte-generacion.json` |
| `limpiar_marcadores.mjs` | Corrige los títulos de los marcadores que Chromium arma mal (ver «Trampas») |
| `verificar_pdf.mjs` | Comprueba tamaño, etiquetado, fuentes, número de gráficas, índice y cifras |
| `inventario.mjs` | Lista lo que muestra hoy `#todo`: secciones, gráficas y controles interactivos |

## Cómo funciona

1. **Carga completa de `#todo`** con un parámetro anticaché. El motor de navegación del sitio no escucha `hashchange`, así que el ancla solo funciona al cargar. Ventana de 960 px, densidad 2× y animaciones apagadas (`prefers-reduced-motion`).
2. **Pestañas en mosaico.** Para cada grupo de pestañas, recorre todos los estados y compara qué cambia (texto y gráficas). Lo que cambia se repite en una celda por estado; lo que no cambia (notas, recuadros) aparece una sola vez.

   | Dónde | Estados | Mosaico |
   |---|---|---|
   | 03 Niveles | 5 pruebas | 1 columna (barras anchas) |
   | 04 Evolución 2022 → 2026 | Global + 5 pruebas | gráficas y tablas, 2 columnas |
   | 06 Por grupo | Global + 5 pruebas | gráficas y tablas, 2 columnas |
   | III Análisis por grupo | Fase III/IV; 5 grupos × 2 fases | 2 columnas |
   | VI Dinámica intra-grupo | Tramo F2→F3 / F3→F4 | 2 columnas |

   Los 5 descriptores de nivel (apartado 10) salen abiertos. El filtro, el buscador y el orden del apartado 8 se ocultan: se imprime el estado por defecto, que ya muestra a todos.
3. **Gráficas a imagen.** Cada `<canvas>` de Chart.js se reemplaza por un `<img>` antes de imprimir.
4. **Paginación.** Cada módulo empieza en página nueva. Ninguna gráfica, tarjeta ni fila de tabla se parte entre páginas, y las tablas repiten su encabezado. Cada título va atado a su introducción y al primer bloque que le sigue; si el conjunto no cabe, el apartado abre página.
5. **Portada, índice y encabezado/pie.** La portada va a sangre (`@page:first`). El índice se resuelve en dos pasadas: primero genera el PDF, ubica cada sección con `pdftotext` y vuelve a generarlo con los números. Encabezado y pie usan cajas de margen CSS con `counter(page)` y `counter(pages)`.
6. **Remate.** Limpia los marcadores y escribe los metadatos (título, autor, asunto) con `exiftool`.

## Decisiones (2026-11-25)

| Tema | Decisión |
|---|---|
| Papel | Carta (216 × 279 mm), márgenes de 18 mm |
| Audiencia | Uso general (sin destinatario en la portada) |
| Nombres de estudiantes | Se conservan, igual que en el sitio |
| Estados ocultos tras pestañas | Todos, en mosaico |
| Escala de impresión | 0,85: cuerpo ≈ 9,6 pt y notas ≈ 8,3 pt. Las media queries ven 960 px y el contenido mide 800 px |
| Fondo | Interiores en blanco (ahorra tinta); el crema de la marca queda en la portada y en las tarjetas |

## Verificación (`npm run verificar`)

- Página Carta (612 × 792 pt) y PDF etiquetado.
- Instrument Serif, Geist, JetBrains Mono y Source Serif 4 incrustadas, y ninguna fuente sin incrustar.
- Tantas imágenes como gráficas convirtió el exportador (60 con el commit 9db45c0).
- Índice estable entre las dos pasadas.
- **Cada cifra decimal visible en el sitio aparece en el texto del PDF** (369 con el commit 9db45c0): el PDF no reescribe ni redondea nada.

La revisión visual no se automatiza: conviene hojear el PDF o sus miniaturas (`pdftoppm -r 40 -png`) buscando páginas en blanco, cortes o restos de la interfaz web.

## Trampas conocidas

- **Escala y media queries.** Con `scale: 0.85`, las media queries del sitio ven el ancho de página entre la escala (960 px), pero el contenido mide 800 px. El margen de 18 mm no se escala. Por eso la captura se hace a 960 px con `.container` fijado en 800 px.
- **Chart.js redibuja al imprimir** y deforma las gráficas si siguen siendo `<canvas>`; de ahí la conversión a imagen.
- **`break-after: avoid` no funciona frente a una cuadrícula** en Chromium, y deja títulos huérfanos al pie. Por eso se usa un envoltorio indivisible.
- **Ese envoltorio duplica el texto de los marcadores** («Promedio Promedio por pruebapor prueba») y los `<br>` unen palabras («Aleatorioen»). `limpiar_marcadores.mjs` lo corrige solo cuando el resultado coincide, sin espacios, con un título real de la página.
- **Si el sitio agrega o quita pestañas**, hay que actualizar la lista `GRUPOS` de `exportar_pdf.mjs` (los selectores de cada grupo); `npm run inventario` muestra los controles vigentes.

## Referencias cruzadas

- [README del dashboard, sección «Versión PDF»](../README.md#versión-pdf).
- Módulo ★ Saber 11° 2026: lo genera `Saber-ICFES-2026/scripts/exportar_dashboard.py` (proyecto Todo-Pajaro). Regenerar este PDF después de cada `--inyectar` publicado.
- Segundo cerebro (local): `Análisis-Resultados-ICFES/segundo-cerebro/wiki/conceptos/simulacros-sedquindio-2026.md` y su bitácora (`wiki/log.md`, entrada del 2026-11-25).
