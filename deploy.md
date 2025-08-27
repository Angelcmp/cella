# Estrategia de Despliegue y Escalabilidad para DocAI

Este documento describe el plan estratégico para el despliegue, la gestión de fases y la monetización del proyecto DocAI, asegurando un crecimiento sostenible y una arquitectura robusta.

## 1. Estrategia de Despliegue por Fases

Se propone un modelo de despliegue basado en fases para permitir pruebas rigurosas, obtener feedback y garantizar la estabilidad antes del lanzamiento público.

| Fase | Objetivo | Flujo de Trabajo con Git y Vercel | Dominio Ejemplo |
| :--- | :--- | :--- | :--- |
| **Alfa** | Pruebas internas de nuevas funcionalidades. | 1. Desarrollo en ramas `feature/*`.<br>2. Vercel crea **Preview Deployments** por cada Pull Request.<br>3. El equipo prueba con URLs únicas y aisladas. | `docai-pr-123.vercel.app` |
| **Beta** | Obtener feedback de un grupo selecto de usuarios. | 1. Las features estables se fusionan en la rama `beta`.<br>2. Vercel despliega esta rama en un subdominio fijo.<br>3. Los beta testers usan una versión estable pero no de producción. | `beta.docai.com` |
| **Producción** | Lanzamiento público de la aplicación. | 1. La rama `beta` probada se fusiona en `main`.<br>2. Vercel despliega automáticamente la rama `main`.<br>3. La versión es accesible para todos los usuarios. | `www.docai.com` |

---

## 2. Plan de Hosting y Servicios Recomendados

La arquitectura se distribuirá en servicios especializados para optimizar el rendimiento, la seguridad y la escalabilidad.

| Componente | Servicio Recomendado | Plan Inicial | Plan de Escalado | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend (Next.js)** | Vercel | **Hobby (Gratis)** | Pro ($20/mes) | Integración nativa con Next.js, despliegues automáticos y Preview Deployments. |
| **Backend (FastAPI) & Worker** | Railway / Render | Plan Gratuito | Planes de pago | Facilidad de despliegue para Python, escalado sencillo y gestión de variables de entorno. |
| **Base de Datos** | Supabase / Neon | Plan Gratuito | Planes de pago | PostgreSQL gestionado con la extensión **pgvector** incluida, esencial para el sistema RAG. |
| **Almacenamiento de Archivos** | Cloudflare R2 / AWS S3 | Capa Gratuita | Pago por uso | Almacenamiento de objetos escalable, seguro y económico, desacoplado del servidor. |

---

## 3. Modelo de Gestión de Tokens y Límites de Uso

Se implementará un sistema de medición de consumo de tokens para ofrecer un plan gratuito sostenible y un plan premium de alto valor.

### Sistema de Medición (Metering)
- **Base de Datos:** Crear una tabla `token_usage` para registrar cada consumo por usuario y funcionalidad.
- **Backend:** En cada llamada a la API de Gemini, obtener el recuento de tokens y actualizar el balance del usuario en la base de datos.

### Comparativa de Planes

| Característica | Plan Gratuito/Estándar | Plan Premium |
| :--- | :--- | :--- |
| **Límite Principal** | Límite de tokens mensual (ej: 100,000), **duro y visible**. | **"Ilimitado"** bajo una Política de Uso Justo (Fair Use Policy). |
| **Mecanismo** | Chequeo de balance antes de cada llamada. El servicio se detiene al llegar a 0. | **Límite de velocidad** (ej: 20 peticiones/minuto) + un límite blando muy alto (ej: 10M tokens) para detectar abuso. |
| **Interfaz (UI)** | Contador de tokens visible en el dashboard, con una clara llamada a la acción para mejorar el plan. | **Sin contador de tokens**. La experiencia se siente fluida e ilimitada. |
| **Prevención de Abuso** | El propio límite previene el abuso a gran escala. | El *rate limiting* frena bots y scripts. El monitoreo del límite blando alerta sobre cuentas anómalas. |

---

## 4. Resumen de Pasos de Implementación

Para llevar a cabo esta estrategia, se requieren las siguientes adaptaciones en el código:

1.  **Centralizar la Configuración:** Mover todas las claves y URLs a **variables de entorno** y cargarlas en los servicios de hosting correspondientes.
2.  **Migrar la Base de Datos:** Actualizar el código del backend y worker para conectar con **PostgreSQL** (usando `psycopg2-binary`) en lugar de SQLite.
3.  **Integrar Almacenamiento de Objetos:** Modificar la lógica de subida de archivos para guardarlos en un bucket de **Cloudflare R2 o AWS S3** en lugar del sistema de archivos local.
4.  **Implementar Lógica de Tokens:**
    *   Añadir el sistema de **medición de tokens** en todas las llamadas a la API de IA.
    *   Implementar el **chequeo de balance** para usuarios gratuitos.
    *   Añadir un middleware de **rate limiting** en FastAPI para los usuarios premium.
