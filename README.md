# Dashboard ICFES Saber 11° · I.E. Pedacito de Cielo

Análisis longitudinal de cuatro simulacros tipo Saber 11° (Fases I, II, III y IV) aplicados por la Secretaría de Educación Departamental del Quindío entre febrero y mayo de 2026, de cara al **examen Saber 11° oficial del 26 de julio de 2026**.

**Ver dashboard:** [https://alvaretto.github.io/icfes-dashboard/](https://alvaretto.github.io/icfes-dashboard/)

---

## Por qué existe este dashboard

La institución presenta cuatro simulacros de práctica antes de la prueba real. Cada reporte de la SED llega como un **promedio institucional único** — y ese promedio **miente**: esconde que el grado once reúne dos modalidades muy distintas (bachillerato regular 11A/11B y el programa flexible *PENSAR* 3A/3B/3C, para estudiantes en extraedad), con brechas de más de 80 puntos entre grupos y de 34 puntos entre cursos dentro de la misma modalidad.

Este dashboard convierte **253+ presentaciones individuales** en inteligencia accionable para responder tres preguntas que el promedio no puede:

1. **¿Quién está progresando de verdad?** — filtrando a los mismos estudiantes a lo largo de las fases (cohorte estable), para separar aprendizaje real de cambios de composición.
2. **¿Dónde intervenir primero?** — desagregando por grupo, por área, por competencia y por estudiante, para dirigir el refuerzo a donde rinde más antes del 26 de julio.
3. **¿Qué es señal y qué es ruido?** — distinguiendo caídas reales (p. ej. Matemáticas) de artefactos del instrumento o de la asistencia.

### Principios metodológicos

- **Sin imputación.** Ningún dato se inventa. Cuando un reporte llega consolidado, el desglose se **reconstruye por enlace nominal**: cada estudiante se cruza por nombre contra el listado oficial de matrícula. El validador es que los 74 de Fase IV emparejaron sin ambigüedad (0 huérfanos, 0 duplicados).
- **Fórmula oficial ICFES.** Todos los globales usan el ponderado oficial `(3·LC + 3·Mat + 3·Soc + 3·Nat + 1·Inglés) / 13 × 5` (rango 0–500; Res. 268/2020), no la suma simple con que la SED imprime algunos titulares.
- **Fase IV integrada.** El PDF de F4 (26 may) llegó *con detalle por estudiante pero sin columna de grupo*; ese grupo se reconstruyó por enlace nominal, de modo que F4 ya enriquece cada sección: series que llegan hasta F4 y "fotos" que comparan **F3 vs F4** (muchas gráficas tienen un selector de fase).

---

## Cómo leerlo · conceptos clave

- **Fases:** F1 (25 feb, solo regulares) · F2 (24 mar, entran los PENSAR) · F3 (27 abr, consolidado) · F4 (26 may, consolidado, el más alto de la serie).
- **Cohorte estable:** solo los estudiantes presentes en varias fases. Es el indicador longitudinal más confiable, porque elimina el ruido del cambio de población entre pruebas.
- **Regular vs PENSAR:** la etiqueta administrativa no ordena el rendimiento — **el grupo específico y su momento, sí**. En F3 los extremos eran ambos PENSAR; en F4 se invierten y son ambos regulares.
- **Toggle F3/F4:** en las gráficas de "foto de una fase" (grupos por área, niveles, riesgo, etc.) un selector permite comparar la Fase III con la Fase IV.

---

## Las 11 secciones · qué responde cada una

| # | Sección | Pregunta que responde | Por qué está |
|---|---|---|---|
| **I** | **Resumen ejecutivo** | ¿Cómo cerró la institución en la última fase? | Las cinco cifras que importan de F4 (promedios por área, riesgo crítico) más las señales estructurales que persisten. Si solo se mira una pantalla, es esta. |
| **II** | **Evolución longitudinal** | ¿Cómo se movió cada área entre febrero y mayo? | Traza F1→F4 por área. Separa el cambio real del cambio de población (F1–F2 solo regulares; F3–F4 consolidado) y muestra la reconstrucción de F4 por curso. |
| **III** | **Análisis por grupo** | ¿Qué esconde el promedio institucional? | Desagrega en los 5 grupos: ranking, áreas, niveles, asistencia y podio nominal, con comparación F3 vs F4. Aquí aparece la reordenación que trae la Fase IV. |
| **IV** | **Foco · Matemáticas** | ¿Por qué Matemáticas es el cuello de botella? | Es el área más débil y volátil. Desglosa componentes (Aleatorio, Geométrico, Numérico) y competencias en las 4 fases, para orientar la intervención docente. |
| **V** | **Cohorte estable** | ¿Quién progresó de verdad, sin ruido de composición? | Filtra a los mismos estudiantes en varias fases. Incluye trayectorias individuales, top de mejoras/retrocesos y los agregados por área de 11A+11B (F1→F4) y PENSAR (F2→F4). |
| **VI** | **Dinámica intra-grupo** | ¿Qué NO dice el promedio de cada grupo? | Dispersión, riesgo crítico (≥3 áreas en Nivel 1), momentum entre fases y heterogeneidad interna. Dos grupos con igual promedio pueden ser muy distintos. |
| **VII** | **Equidad y dispersión** | ¿Cuán desigual es el rendimiento dentro de la institución? | Mide la brecha entre los que más y menos saben (cuartiles/deciles). Una media alta con dispersión alta exige estrategias distintas a una media baja homogénea. |
| **VIII** | **Estructura de correlaciones** | ¿Qué áreas se mueven juntas? | Un buen lector no es necesariamente bueno en Matemáticas. La descorrelación de Matemáticas indica que requiere una intervención propia, no transversal. |
| **IX** | **Identificación nominal** | ¿Quién, con nombre y apellido? | Convierte el análisis en acción: quién necesita plan individual urgente y quién es candidato natural para tutoría entre pares. |
| **X** | **Trayectoria histórica 2016–2025** | ¿Este resultado es bueno o malo en contexto? | Cruza diez años de reportes oficiales Saber 11°. La institución viene cayendo; el Modelo Flexible aparece al menos desde 2017 y la brecha Regular–Flexible se está cerrando. |
| **XI** | **Síntesis y acción** | ¿Qué hacemos antes del 26 de julio? | Diez hallazgos con recomendaciones data-driven priorizadas, para no llegar a la prueba real repitiendo los errores de los simulacros. |

---

## Fuentes (PDFs SED Quindío)

- **F1** · *I.E PEDACITO DE CIELO primer simulacro.pdf* (25 feb 2026) — solo grupos regulares 11A+11B (global 212,6).
- **F2 regulares** · *I.E PEDACITO DE CIELO (SIN PENSAR).pdf* (24 mar 2026, global 219,4).
- **F2 PENSAR** · *I.E PEDACITO DE CIELO (PENSAR).pdf* (24 mar 2026, n=48, global 214,0).
- **F3 consolidado** · *I.E PEDACITO DE CIELO(2).pdf* (27 abr 2026, n=77, todos los grupos, global 201,6).
- **F4** · *I.E PEDACITO DE CIELO FASE IV.pdf* (26 may 2026) — consolidado institucional, n=74, **con detalle por estudiante pero sin columna de grupo/modalidad** (el grupo se reconstruyó por enlace nominal contra el roster oficial). Punto más alto de la serie (global **238,1**, fórmula oficial ICFES ponderada).

Roster de matrícula: *Listado-Oficial-TODOS-julio2026.xls* (84 estudiantes en 5 grupos). Enlace longitudinal por estudiante: *panel-maestro-estudiantes-F1-F4*.

## Tecnología

Archivo HTML autocontenido. Solo requiere conexión a internet para cargar fuentes (Google Fonts) y Chart.js (cdnjs). Sirve directamente vía GitHub Pages.

---

*I.E. Pedacito de Cielo · La Tebaida, Quindío · Julio 2026*
