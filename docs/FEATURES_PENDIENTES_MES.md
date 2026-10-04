# Features pendientes — Plan del mes

Lista viva de trabajo para el mes. Agrupada por tema; los ítems marcados
*(horizonte mayor)* son programas de varios meses y se dejan planificados,
no cerrados dentro del mes.

## 1) Integraciones y fuentes

- [ ] Definir integraciones: PDF, sitios web (web search), notas (`.md`), DOI / referencia cruzada, Google Scholar, erudito semántico.
- [ ] Mapa semántico.

## 2) Seguridad y privacidad

- [ ] Seguridad y cumplimiento: SOC 2 Type II, ISO 27001, HIPAA, RGPD (solo si aplica al chat). La página no tendrá usuarios. Nada de formación de datos en el sistema. Cifrado. *(horizonte mayor: SOC 2 / ISO)*
- [ ] Cifrado AES-256.
- [ ] End-to-end encryption. *(horizonte mayor)*

## 3) Modelos e infraestructura LLM

- [ ] Redefinir API keys y modelos LLM locales.

## 4) Chat y respuestas

- [ ] Agregar 3 modos de respuesta de IA:
  - **All**: buscar en todo lo que está dentro del chat.
  - **External**: buscar solo en la web.
  - **Project**: buscar únicamente en el proyecto o chat actual (PDF adjunto o archivos).
- [x] Al hacer una consulta a la IA, generar *follow-ups*: recomendaciones de chat para continuar con las consultas o investigaciones.
- [x] El botón `+` debe contener únicamente: agregar archivo (PDF, DOCX, PPTX, imágenes), agregar contexto y agregar skill de IA.

## 5) Citas

- [ ] Mejora de citas.

## 6) Studio y salida de IA

- [ ] Mejorar mapa mental y resúmenes.
- [ ] Mejorar diseño de grafos de ideas.
- [ ] Mejorar fuentes de resumen de IA y su interfaz en el aside.
- [ ] Redefinir notas rápidas.
- [ ] Mejorar diseño de guías rápidas.
- [ ] Mejorar diseño de preguntas frecuentes.

## 7) Documentación

- [ ] Mejorar documentación (diseño).

## 8) Visor de documento

- [x] Acciones del visor:
  - [x] Página anterior / siguiente (de una en una).
  - [x] Ir a una página concreta (número de página, 1…N).
  - [x] Zoom in / zoom out.
  - [x] Ajustar a página (*fit to page*).
  - [x] Rotar 90° (sentido horario).
  - [x] Descargar PDF. Los documentos convertidos ofrecen su archivo original DOCX o PPTX.

## 9) Límites de archivos y proyecto

- [x] Definir límite de PDF: 200 MB / 5000 páginas.
- [x] DOCX y PPTX: 200 MB.
- [x] Imágenes PNG, JPG, JPEG, GIF o WebP: 25 MB *(límite definido; la ingesta/OCR de imágenes queda pendiente en Integraciones)*.
- [x] Máximo 10 archivos por proyecto.
