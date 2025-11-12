# DocAI - Documentación Completa
*Plataforma SaaS de Análisis Inteligente de Documentos con IA*

---

## 📋 Índice

1. [**Descripción del Proyecto**](#1-descripción-del-proyecto)
2. [**Instalación y Configuración**](#2-instalación-y-configuración)
3. [**Guía de Usuario**](#3-guía-de-usuario)
4. [**Documentación Técnica**](#4-documentación-técnica)
5. [**API Reference**](#5-api-reference)
6. [**Arquitectura del Sistema**](#6-arquitectura-del-sistema)
7. [**Despliegue y Producción**](#7-despliegue-y-producción)
8. [**Seguridad**](#8-seguridad)
9. [**Testing y Calidad**](#9-testing-y-calidad)
10. [**FAQ y Troubleshooting**](#10-faq-y-troubleshooting)
11. [**Recursos Adicionales**](#11-recursos-adicionales)

---

## 1. Descripción del Proyecto

### 1.1 ¿Qué es DocAI?

DocAI es una plataforma SaaS que permite a usuarios analizar documentos inteligentemente mediante IA. Los usuarios pueden:

- **Subir documentos** (PDF, Word, PowerPoint, TXT)
- **Hacer preguntas** sobre el contenido mediante chat
- **Generar resúmenes automáticos** con IA
- **Obtener respuestas con citas** precisas del documento
- **Visualizar documentos** con herramientas avanzadas

### 1.2 Público Objetivo

- **Estudiantes** - Análisis de material académico
- **Profesionales** - Revisión de contratos, reportes
- **Investigadores** - Análisis de papers y literatura
- **Abogados** - Revisión de documentos legales
- **Consultores** - Análisis de informes empresariales

### 1.3 Propuesta de Valor

- **Respuestas instantáneas** con citas precisas
- **Resúmenes automáticos** de calidad profesional
- **Chat inteligente** tipo RAG (Retrieval Augmented Generation)
- **Interfaz intuitiva** y profesional
- **Procesamiento multiformat** (PDF, DOCX, PPTX, TXT)

### 1.4 Estado Actual

**✅ MVP 100% Funcional** - Aplicación completa lista para uso real

#### Funcionalidades Implementadas:
- ✅ Sistema de autenticación completo
- ✅ Upload y procesamiento de documentos
- ✅ Chat RAG con documentos usando Gemini AI
- ✅ Resúmenes automáticos inteligentes
- ✅ Document viewer profesional
- ✅ Dashboard completo con estadísticas
- ✅ Perfiles de usuario avanzados
- ✅ API RESTful completa

### 1.5 Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Frontend** | Next.js + TypeScript + Tailwind CSS | 15.x |
| **Backend** | FastAPI + Python | 3.11+ |
| **Base de Datos** | SQLite (dev) / PostgreSQL (prod) | - |
| **IA** | Google Gemini API (1.5 Flash/Pro) | Latest |
| **Worker** | Python + Background Processing | 3.11+ |
| **Almacenamiento** | Local (dev) / S3/R2 (prod) | - |
| **Deploy** | Vercel + Railway/Render | - |

### 1.6 Modelo de Negocio

#### Plan Gratuito:
- 3 documentos por mes
- 50 preguntas por documento
- Documentos hasta 30MB
- Resúmenes básicos

#### Plan Premium:
- Documentos ilimitados
- Preguntas ilimitadas
- Documentos hasta 100MB
- Resúmenes avanzados
- Exportación a PDF/Word
- Soporte prioritario

---

## 2. Instalación y Configuración

### 2.1 Requisitos Previos

#### Requisitos del Sistema:
- **Node.js** 18.x o superior
- **Python** 3.11 o superior
- **Git** para clonar el repositorio
- **4GB RAM** mínimo recomendado

#### Herramientas Opcionales:
- **Docker** y **Docker Compose** (para entorno containerizado)
- **VS Code** con extensiones de Python y TypeScript

### 2.2 Instalación Paso a Paso

#### Paso 1: Clonar el Repositorio
```bash
git clone <repository-url>
cd DocAI
```

#### Paso 2: Configurar Backend (API)
```bash
# Navegar al directorio de la API
cd apps/api

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
vvenv\Scripts\activate     # Windows

# Instalar dependencias
pip install -r requirements.txt
```

#### Paso 3: Configurar Frontend
```bash
# Navegar al directorio web
cd apps/web

# Instalar dependencias
npm install
# o
yarn install
```

#### Paso 4: Configurar Worker (Opcional)
```bash
cd apps/worker
pip install -r requirements.txt
```

### 2.3 Configuración de Variables de Entorno

#### Backend (.env en apps/api/)
```env
# Base de datos
DATABASE_URL=sqlite:///./docai.db

# API Keys
GEMINI_API_KEY=tu_gemini_api_key_aqui

# JWT
SECRET_KEY=tu_secret_key_super_segura

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=31457280  # 30MB
```

#### Worker (.env en apps/worker/)
```env
# API Keys
GEMINI_API_KEY=tu_gemini_api_key_aqui

# Base de datos
DATABASE_URL=sqlite:///./docai.db

# Configuración de procesamiento
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### 2.4 Obtener API Keys

#### Gemini API (Gratis)
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta Google
3. Clic en "Create API key"
4. Copia la clave generada

**Límites gratuitos:**
- 15 requests/min para generación
- 1500 requests/day total
- 100 requests/min para embeddings

### 2.5 Ejecutar la Aplicación

#### Método 1: Manual (Recomendado para desarrollo)
```bash
# Terminal 1 - Backend API (puerto 8000)
cd apps/api
python main.py

# Terminal 2 - Frontend (puerto 3000)
cd apps/web
npm run dev

# Terminal 3 - Worker (opcional)
cd apps/worker
python worker.py
```

#### Método 2: Docker Compose
```bash
# Ejecutar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 2.6 Verificar Instalación

#### URLs para Verificar:
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **API Health:** http://localhost:8000/health

#### Comandos de Verificación:
```bash
# Verificar API
curl http://localhost:8000/health

# Verificar Frontend
curl http://localhost:3000

# Verificar base de datos
ls -la apps/api/docai.db
```

### 2.7 Configuración de Desarrollo

---

## 2.8 Cambios recientes (Octubre 2025)

### RAG – Quick Wins para mejorar calidad de respuestas

Se aplicaron mejoras en la recuperación y la generación de respuestas del chat con documentos.

- Re-ranking con MMR (Maximal Marginal Relevance)
  - Se seleccionan fragmentos diversificados, reduciendo redundancia.
  - Parám.: `RAG_MMR_LAMBDA` (default 0.7).
- Umbral de cobertura (abstención segura)
  - Se calcula cobertura como la media de similitud de los top-3 fragmentos.
  - Si `coverage < RAG_MIN_COVERAGE` (default 0.22), se devuelve mensaje conservador sugiriendo reformulación o más contexto.
- Prompt de chat mejorado
  - Reglas explícitas para abstenerse, formato con sección “Citas” y tono conciso.
- Anclaje por oración y señal de confianza
  - Se mapean oraciones de la respuesta a fragmentos por n-gram overlap.
  - Se devuelven `confidence`, `coverage` y `chunks_found` en el payload del chat.

Código afectado
- `apps/api/rag_system.py`: búsqueda con MMR, prompt mejorado, anclaje y cálculo de señales.
- `apps/api/routers/chat.py`: `ChatResponse` ahora expone `confidence`, `coverage`, `chunks_found`.

Variables de entorno nuevas
```env
# RAG – MMR y cobertura
RAG_MMR_LAMBDA=0.7         # Diversidad vs. relevancia
RAG_MIN_COVERAGE=0.22       # Umbral mínimo de cobertura media (top-3)
RAG_SENTENCE_ANCHOR_MIN_JACCARD=0.05  # Mínimo Jaccard para anclaje por oración
```

### Visor de documentos – PDF original por defecto

- El visor muestra por defecto el PDF original embebido (sin transformaciones).
- Endpoint `GET /documents/{id}/file` ahora devuelve media-type correcto y `Content-Disposition: inline`.
- Se removió el botón “Pantalla Completa” y el buscador en el visor cuando se muestra PDF.

Código afectado
- Backend: `apps/api/routers/documents.py` (media-type + inline)
- Frontend: `apps/web/src/app/dashboard/documents/[documentId]/viewer/page.tsx`

### UI – Inputs de chat/búsqueda unificados

- Inputs con clase `chat-input`: fondo beige (o gris en dark), texto sin negrita y sin halo de focus.
- Aplicado en: chat con documento, selector de chat, documentos y visor.

---

## 2.9 Siguientes pasos recomendados (nivel LLM mejorado)

- Recuperación híbrida y motor vectorial
  - Añadir BM25 (SQLite FTS5 como puente) + vectorial con rank fusion.
  - Migración a Postgres + pgvector (HNSW/IVFFlat) con normalización y ajuste de `ef_search`.
- Generación y fidelidad
  - Cadena de evidencia (plan → evidencias → respuesta) y verificación de oraciones sin soporte.
  - Streaming de respuestas.
- Resúmenes
  - Resumen jerárquico (map-reduce por secciones / encabezados) con control de tokens.
- Evaluación
  - Extender `scripts/rag_eval.py` con P@k, RAGAS (support/faithfulness) y datasets de QA.
- UX
  - Mostrar barra de `confidence`/`coverage` en UI y sugerencias de follow-up.

#### Hot Reload
- **Frontend:** Automático con `npm run dev`
- **Backend:** Automático con `uvicorn --reload`
- **Worker:** Reinicio manual requerido

#### Estructura de Archivos de Configuración
```
DocAI/
├── apps/
│   ├── api/.env           # Variables del backend
│   ├── worker/.env        # Variables del worker
│   ├── web/.env.local     # Variables del frontend (opcional)
├── docker-compose.yml      # Configuración Docker
└── .env.example           # Plantilla de variables
```

---

## 3. Guía de Usuario

### 3.1 Primeros Pasos

#### Crear una Cuenta
1. Ve a http://localhost:3000
2. Clic en **"Registrarse"**
3. Completa el formulario:
   - **Email:** tu-email@ejemplo.com
   - **Contraseña:** Mínimo 6 caracteres
   - **Confirmar contraseña:** Repetir la contraseña
4. Clic en **"Crear Cuenta"**
5. Redirección automática al login

#### Iniciar Sesión
1. En la página de login
2. Ingresa email y contraseña
3. Clic en **"Iniciar Sesión"**
4. Acceso automático al dashboard

### 3.2 Dashboard Principal

#### Elementos del Dashboard:
- **Header:** Información del usuario y navegación
- **Estadísticas:** Documentos, créditos, plan actual
- **Acciones rápidas:** Upload, gestionar documentos, chat
- **Menú lateral:** Navegación completa

#### Estadísticas Mostradas:
| Métrica | Descripción |
|---------|-------------|
| **Documentos** | Total de documentos subidos |
| **Créditos** | Créditos disponibles para usar IA |
| **Plan** | Plan actual (Free/Premium) |
| **Actividad** | Última actividad registrada |

### 3.3 Subir Documentos

#### Formatos Soportados:
- **PDF** (.pdf) - Hasta 30MB
- **Word** (.docx) - Hasta 30MB  
- **PowerPoint** (.pptx) - Hasta 30MB
- **Texto** (.txt) - Hasta 10MB

#### Proceso de Upload:
1. Ve a **Dashboard → Upload** o clic en área de upload
2. **Arrastra y suelta** archivos o **clic para seleccionar**
3. **Validación automática** de formato y tamaño
4. **Upload inmediato** con barra de progreso
5. **Procesamiento automático** en background

#### Estados del Documento:
| Estado | Color | Descripción |
|--------|-------|-------------|
| **Pendiente** | 🟡 Amarillo | Subido, esperando procesamiento |
| **Procesando** | 🔵 Azul | Extrayendo texto y generando embeddings |
| **Listo** | 🟢 Verde | Procesado, disponible para chat |
| **Error** | 🔴 Rojo | Error en procesamiento |

### 3.4 Chat con Documentos (RAG)

#### Iniciar un Chat:
1. Ve a **Dashboard → Documentos**
2. Busca un documento con estado **"Listo"**
3. Clic en botón **"Chat"**
4. Se abre la interfaz de chat

#### Cómo Hacer Preguntas Efectivas:

##### ✅ Preguntas Recomendadas:
```
"¿De qué trata este documento?"
"Dame un resumen de los puntos principales"
"¿Qué dice sobre [tema específico]?"
"¿Cuáles son las conclusiones?"
"Explícame la sección sobre [tema]"
"¿Hay datos numéricos sobre [concepto]?"
```

##### ❌ Preguntas a Evitar:
```
"¿Qué piensas de esto?" (muy subjetivo)
"¿Es verdad que...?" (información externa)
"Compara con [documento no subido]"
```

#### Interpretar Respuestas:

Las respuestas incluyen:
- **Respuesta contextual** basada en el documento
- **Citas automáticas** con:
  - Número de página
  - Fragmento de texto exacto
  - Porcentaje de relevancia

#### Ejemplo de Respuesta:
```
El documento explica que la implementación de IA puede 
reducir costos operativos hasta un 40% según los estudios 
presentados.

📖 Citas:
- Página 15: "Los estudios demuestran una reducción de 
  costos del 35-45% tras la implementación..." (Relevancia: 95%)
- Página 23: "Netflix reportó ahorros de $1B anuales 
  gracias a IA..." (Relevancia: 87%)
```

### 3.5 Document Viewer

#### Características del Viewer:
- **Visualización tipo papel** con dimensiones estándar
- **Zoom dinámico** de 50% a 300%
- **Modo lectura** inmersivo
- **Búsqueda en tiempo real** con highlighting
- **Navegación por páginas**

#### Controles Disponibles:
| Control | Función |
|---------|---------|
| **Zoom +/-** | Aumentar/reducir tamaño |
| **Fit Width** | Ajustar al ancho de pantalla |
| **Fit Page** | Ajustar página completa |
| **Modo Lectura** | Ocultar controles |
| **Búsqueda** | Encontrar texto específico |

#### Navegación:
- **Flechas laterales** para páginas anterior/siguiente
- **Campo de página** para salto directo
- **Thumbnails** para navegación visual

### 3.6 Resúmenes Automáticos

#### Acceso a Resúmenes:
1. Ve a **Dashboard → Documentos**
2. Selecciona documento procesado
3. Clic en **"Ver Resumen"**

#### Estructura del Resumen:
- **Executive Summary** - Resumen ejecutivo breve
- **Puntos Clave** - Ideas principales organizadas
- **Temas Principales** - Categorías identificadas
- **Estadísticas** - Información sobre procesamiento

#### Ejemplo de Resumen:
```
📋 Executive Summary:
Este documento analiza la implementación de IA en empresas, 
destacando beneficios como reducción de costos (40%) y 
mejora de eficiencia (60%).

🎯 Puntos Clave:
• Automatización de procesos repetitivos
• Análisis predictivo para toma de decisiones
• Personalización de experiencia del cliente
• Optimización de recursos operativos

🏷️ Temas Principales:
- Tecnología e Innovación
- Automatización Empresarial
- Análisis de Datos
- ROI y Métricas
```

### 3.7 Gestión de Perfil

#### Acceder al Perfil:
1. Clic en **avatar** en el header
2. Seleccionar **"Mi Perfil"**
3. Acceso a 4 pestañas principales

#### Pestañas del Perfil:

##### **Pestaña Perfil:**
- Editar nombre completo
- Cambiar email (requiere verificación)
- Información de la cuenta
- Avatar con iniciales automáticas

##### **Pestaña Seguridad:**
- Cambiar contraseña
- Historial de sesiones
- Configuración de seguridad

##### **Pestaña Estadísticas:**
- Documentos procesados
- Chats realizados
- Almacenamiento usado
- Actividad reciente

##### **Pestaña Preferencias:**
- Configuraciones de notificaciones
- Preferencias de chat
- Idioma y región
- Configuración de UI

### 3.8 Flujo de Trabajo Típico

#### Flujo Completo Recomendado:
```
1. 📝 Registro/Login
   ↓
2. 📤 Subir Documento
   ↓
3. ⏳ Esperar Procesamiento (1-3 min)
   ↓
4. 📋 Ver Resumen Automático
   ↓
5. 💬 Hacer Preguntas Específicas
   ↓
6. 📖 Usar Document Viewer
   ↓
7. 🔄 Repetir con Más Documentos
```

#### Consejos para Mejor Experiencia:
- **Documenta tus consultas** para referencia futura
- **Usa preguntas específicas** para mejores respuestas
- **Revisa las citas** para validar información
- **Combina viewer y chat** para análisis completo

---

## 4. Documentación Técnica

### 4.1 Estructura del Proyecto

#### Arquitectura Monorepo:
```
DocAI/
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── routers/           # Endpoints organizados
│   │   ├── models/            # Modelos de base de datos
│   │   ├── services/          # Lógica de negocio
│   │   ├── utils/             # Utilidades compartidas
│   │   └── main.py            # Aplicación principal
│   ├── web/                   # Frontend Next.js
│   │   ├── src/app/           # App Router (Next.js 13+)
│   │   ├── src/components/    # Componentes React
│   │   ├── src/lib/           # Utilidades y configuración
│   │   └── package.json       # Dependencias frontend
│   └── worker/                # Procesamiento background
│       ├── document_processor.py  # Procesador de documentos
│       ├── worker.py          # Worker principal
│       └── requirements.txt   # Dependencias worker
├── docker/                    # Configuraciones Docker
├── docs/                      # Documentación adicional
└── scripts/                   # Scripts de desarrollo
```

### 4.2 Tecnologías y Dependencias

#### Backend (FastAPI):
```python
# Dependencias principales
fastapi==0.104.1          # Framework web moderno
uvicorn==0.24.0           # Servidor ASGI
sqlalchemy==2.0.23        # ORM para base de datos
pydantic==2.5.0           # Validación de datos
python-jose==3.3.0        # JWT tokens
bcrypt==4.1.2             # Hash de contraseñas
python-multipart==0.0.6   # Upload de archivos

# IA y Procesamiento
google-generativeai==0.3.2  # Gemini API
pypdf==3.17.1             # Procesamiento PDF
python-docx==1.1.0        # Procesamiento Word
python-pptx==0.6.23       # Procesamiento PowerPoint
numpy==1.24.3             # Operaciones numéricas
scikit-learn==1.3.2       # Similitud coseno
```

#### Frontend (Next.js):
```json
{
  "dependencies": {
    "next": "15.0.2",
    "react": "19.0.0", 
    "react-dom": "19.0.0",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.0",
    "@radix-ui/react-*": "latest",
    "lucide-react": "0.294.0",
    "sonner": "1.2.4"
  }
}
```

### 4.3 Base de Datos

#### Esquema Principal (SQLite/PostgreSQL):

##### Tabla `users`:
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    username VARCHAR(100) UNIQUE,
    profile_picture VARCHAR(500),
    plan VARCHAR(20) DEFAULT 'free',
    credits_remaining INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

##### Tabla `documents`:
```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    pages INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

##### Tabla `doc_chunks`:
```sql
CREATE TABLE doc_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    token_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id)
);
```

##### Tabla `doc_embeddings`:
```sql
CREATE TABLE doc_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id INTEGER NOT NULL,
    embedding BLOB NOT NULL,  -- Serialized numpy array
    dimension INTEGER DEFAULT 768,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id) REFERENCES doc_chunks (id)
);
```

##### Tabla `conversations`:
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (document_id) REFERENCES documents (id)
);
```

##### Tabla `messages`:
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    citations TEXT,  -- JSON con citas
    token_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
);
```

### 4.4 Sistema RAG (Retrieval Augmented Generation)

#### Flujo del Procesamiento:

1. **Upload de Documento:**
   ```python
   # apps/api/routers/documents.py
   @router.post("/upload")
   async def upload_document(file: UploadFile):
       # Validar archivo
       # Guardar en sistema de archivos
       # Crear registro en BD
       # Disparar worker de procesamiento
   ```

2. **Procesamiento en Background:**
   ```python
   # apps/worker/document_processor.py
   class DocumentProcessor:
       def process_document(self, document_id):
           # 1. Extraer texto según formato
           text = self.extract_text(file_path)
           
           # 2. Dividir en chunks
           chunks = self.create_chunks(text)
           
           # 3. Generar embeddings
           embeddings = self.generate_embeddings(chunks)
           
           # 4. Guardar en base de datos
           self.save_chunks_and_embeddings(chunks, embeddings)
   ```

3. **Búsqueda Vectorial:**
   ```python
   # apps/api/services/rag_service.py
   def search_similar_chunks(query, document_id, top_k=5):
       # 1. Generar embedding de la consulta
       query_embedding = generate_embedding(query)
       
       # 2. Buscar chunks similares usando cosine similarity
       similar_chunks = find_similar_chunks(
           query_embedding, 
           document_id, 
           top_k
       )
       
       # 3. Retornar chunks ordenados por relevancia
       return similar_chunks
   ```

4. **Generación de Respuesta:**
   ```python
   def generate_answer(question, document_id):
       # 1. Buscar contexto relevante
       context_chunks = search_similar_chunks(question, document_id)
       
       # 2. Construir prompt con contexto
       prompt = build_rag_prompt(question, context_chunks)
       
       # 3. Llamar a Gemini API
       response = gemini_client.generate_content(prompt)
       
       # 4. Extraer citas y formatear respuesta
       return format_response_with_citations(response, context_chunks)
   ```

### 4.5 Integración con Gemini AI

#### Configuración del Cliente:
```python
# apps/api/services/gemini_service.py
import google.generativeai as genai

class GeminiService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.chat_model = genai.GenerativeModel("gemini-1.5-flash")
        self.embedding_model = "text-embedding-004"
    
    def generate_chat_response(self, prompt):
        response = self.chat_model.generate_content(prompt)
        return response.text
    
    def generate_embedding(self, text):
        result = genai.embed_content(
            model=self.embedding_model,
            content=text
        )
        return result['embedding']
```

#### Manejo de Rate Limits:
```python
import time
from functools import wraps

def rate_limit_handler(max_retries=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if "429" in str(e):  # Rate limit
                        wait_time = 2 ** attempt  # Exponential backoff
                        time.sleep(wait_time)
                        continue
                    raise e
            raise Exception("Max retries exceeded")
        return wrapper
    return decorator
```

### 4.6 Procesamiento de Documentos

#### Extracción de Texto por Formato:

##### PDF:
```python
import pypdf
from PIL import Image
import pytesseract

def extract_pdf_text(file_path):
    text_pages = []
    
    with open(file_path, 'rb') as file:
        pdf_reader = pypdf.PdfReader(file)
        
        for page_num, page in enumerate(pdf_reader.pages):
            # Intentar extraer texto directo
            text = page.extract_text()
            
            if len(text.strip()) < 50:  # Posible PDF escaneado
                # Usar OCR como fallback
                text = extract_with_ocr(page)
            
            text_pages.append({
                'page': page_num + 1,
                'content': text
            })
    
    return text_pages
```

##### Word (DOCX):
```python
from docx import Document

def extract_docx_text(file_path):
    doc = Document(file_path)
    text_content = []
    
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_content.append(paragraph.text)
    
    return '\n'.join(text_content)
```

##### PowerPoint (PPTX):
```python
from pptx import Presentation

def extract_pptx_text(file_path):
    prs = Presentation(file_path)
    text_content = []
    
    for slide_num, slide in enumerate(prs.slides):
        slide_text = []
        
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                slide_text.append(shape.text)
        
        if slide_text:
            text_content.append({
                'slide': slide_num + 1,
                'content': '\n'.join(slide_text)
            })
    
    return text_content
```

#### Chunking Inteligente:
```python
def create_smart_chunks(text, chunk_size=1000, overlap=200):
    # Dividir por párrafos primero
    paragraphs = text.split('\n\n')
    
    chunks = []
    current_chunk = ""
    
    for paragraph in paragraphs:
        # Si el párrafo cabe en el chunk actual
        if len(current_chunk + paragraph) < chunk_size:
            current_chunk += paragraph + '\n\n'
        else:
            # Guardar chunk actual y empezar uno nuevo
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            # Si el párrafo es muy largo, dividirlo
            if len(paragraph) > chunk_size:
                sub_chunks = split_long_paragraph(paragraph, chunk_size, overlap)
                chunks.extend(sub_chunks)
                current_chunk = sub_chunks[-1][-overlap:] if overlap else ""
            else:
                current_chunk = paragraph + '\n\n'
    
    # Agregar último chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks
```

---

## 5. API Reference

### 5.1 Información General

- **Base URL:** `http://localhost:8000` (desarrollo) / `https://api.docai.com` (producción)
- **Formato:** JSON
- **Autenticación:** Bearer JWT Token
- **Rate Limiting:** 60 requests/minute por usuario
- **Documentación interactiva:** `/docs` (Swagger UI)

### 5.2 Autenticación

#### POST `/auth/register`
Registrar un nuevo usuario.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (201):**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "full_name": null,
    "plan": "free",
    "credits_remaining": 50
  }
}
```

#### POST `/auth/login`
Iniciar sesión y obtener token de acceso.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "full_name": "Usuario Ejemplo",
    "plan": "free"
  }
}
```

#### GET `/auth/me`
Obtener información del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "usuario@ejemplo.com",
  "full_name": "Usuario Ejemplo",
  "username": "usuario123",
  "plan": "free",
  "credits_remaining": 45,
  "created_at": "2025-09-14T10:30:00Z",
  "last_activity": "2025-09-14T15:45:00Z"
}
```

#### PUT `/auth/profile`
Actualizar información del perfil.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "full_name": "Usuario Actualizado",
  "username": "nuevo_usuario"
}
```

**Response (200):**
```json
{
  "message": "Perfil actualizado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "full_name": "Usuario Actualizado",
    "username": "nuevo_usuario"
  }
}
```

#### PUT `/auth/change-password`
Cambiar contraseña del usuario.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "current_password": "contraseña_actual",
  "new_password": "nueva_contraseña123"
}
```

**Response (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

### 5.3 Gestión de Documentos

#### POST `/documents/upload`
Subir un nuevo documento.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file`: Archivo (PDF/DOCX/PPTX/TXT, máx. 30MB)

**Response (201):**
```json
{
  "message": "Documento subido exitosamente",
  "document": {
    "id": 123,
    "title": "Mi Documento.pdf",
    "filename": "documento_123.pdf",
    "file_size": 2048576,
    "file_type": "pdf",
    "status": "pending",
    "created_at": "2025-09-14T16:00:00Z"
  }
}
```

Nota (Demo/Guest):
- En modo demo con sesiones invitado (`/auth/guest`), se aplica una cuota básica de documentos por usuario.
- Variable de entorno: `GUEST_MAX_DOCUMENTS` (por defecto 1).
- Si el invitado alcanzó su límite, este endpoint responde:

**Response (402 Payment Required):**
```json
{
  "detail": "Guest limit reached: max 1 document(s). Elimina un documento para subir otro."
}
```

#### GET `/documents/`
Listar documentos del usuario.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: Filtrar por estado (pending, processing, indexed, failed)
- `limit`: Número máximo de resultados (default: 20)
- `offset`: Número de resultados a saltar (default: 0)

**Response (200):**
```json
{
  "documents": [
    {
      "id": 123,
      "title": "Mi Documento.pdf",
      "filename": "documento_123.pdf",
      "file_size": 2048576,
      "file_type": "pdf",
      "pages": 45,
      "status": "indexed",
      "summary": "Documento sobre implementación de IA...",
      "created_at": "2025-09-14T16:00:00Z",
      "processed_at": "2025-09-14T16:02:30Z"
    }
  ],
  "total": 1,
  "has_next": false
}
```

#### GET `/documents/{document_id}`
Obtener información específica de un documento.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": 123,
  "title": "Mi Documento.pdf",
  "filename": "documento_123.pdf",
  "file_size": 2048576,
  "file_type": "pdf",
  "pages": 45,
  "status": "indexed",
  "summary": "Este documento analiza...",
  "created_at": "2025-09-14T16:00:00Z",
  "processed_at": "2025-09-14T16:02:30Z",
  "chunk_count": 87,
  "token_count": 15420
}
```

#### GET `/documents/{document_id}/content`
Obtener el contenido procesado del documento.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "document_id": 123,
  "pages": [
    {
      "page_number": 1,
      "content": "Contenido de la página 1...",
      "token_count": 245
    },
    {
      "page_number": 2,
      "content": "Contenido de la página 2...",
      "token_count": 312
    }
  ],
  "total_pages": 45,
  "total_tokens": 15420
}
```

#### GET `/documents/{document_id}/summary`
Obtener el resumen del documento.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "document_id": 123,
  "summary": {
    "executive_summary": "Este documento presenta un análisis...",
    "key_points": [
      "Implementación de IA reduce costos en 40%",
      "ROI positivo en 12-18 meses",
      "Casos de éxito en Netflix, Tesla y Walmart"
    ],
    "main_topics": [
      "Automatización",
      "Análisis Predictivo",
      "Personalización",
      "ROI y Métricas"
    ],
    "statistics": {
      "pages_analyzed": 45,
      "tokens_processed": 15420,
      "processing_time_seconds": 150
    }
  },
  "generated_at": "2025-09-14T16:02:30Z"
}
```

#### POST `/documents/{document_id}/study-guide`
Generar una guía de estudio del documento (puedes acotar a un rango de páginas).

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Request Body:
```json
{
  "pages": { "start": 2, "end": 5 },
  "query": "enfocar en teoría de X",
  "format": "json" // también "markdown"
}
```

Response 200 (JSON):
```json
{
  "success": true,
  "guide": {
    "title": "Guía de estudio – ...",
    "objectives": ["..."],
    "key_concepts": [{"term":"...","definition":"...","pages":"2–3"}],
    "sections": [{"title":"...","summary":"...","pages":"4–5","key_points":["..."],"examples":["..."]}],
    "checkpoints": ["..."],
    "review_questions": [{"question":"...","pages":"2–5"}],
    "estimated_time_minutes": 45
  },
  "pages_used": {"start": 2, "end": 5}
}
```

Response 200 (Markdown):
```json
{
  "success": true,
  "markdown": "## Guía de estudio...\n- Objetivo...",
  "pages_used": {"start": 2, "end": 5}
}
```

Notas:
- Si no se envía `pages`, se usa contexto inicial del documento limitado por tokens.
- Cada ítem debe incluir páginas de sustento cuando estén disponibles en el contexto.

#### POST `/documents/{document_id}/mindmap`
Generar un mapa mental del documento en Markdown con bloque Mermaid, con opciones de enfoque y nivel de detalle.

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Request Body:
```json
{
  "pages": { "start": 2, "end": 6 },
  "query": "enfocar en definiciones clave",
  "focus_mode": "definitions", // options: definitions|processes|actors|timeline
  "detail_level": 2             // 1..3 (6/10/14 nodos aprox.)
}
```

Response 200:
```json
{
  "success": true,
  "markdown": "```mermaid\nmindmap\n  root) Título ...\n    :: Rama [pág. 3–4]\n      ::: Subrama ...\n```",
  "metadata": {
    "nodes": [
      { "label": "Rama [pág. 3–4]", "clean_label": "Rama", "pages": {"start":3,"end":4}, "snippet": "extracto breve..." },
      { "label": "Subrama", "clean_label": "Subrama", "pages": null, "snippet": "..." }
    ]
  },
  "pages_used": {"start": 2, "end": 6}
}
```

Notas:
- La UI ofrece una “Vista conceptual” (grafo estilo mapa) y “Vista Mermaid”. En la vista conceptual las etiquetas no muestran páginas; las páginas y snippets aparecen en tooltips.
- Clic en un nodo abre el visor PDF en la página correspondiente.

#### POST `/documents/{document_id}/quiz`
Generar un cuestionario de opción múltiple (Markdown) del documento o rango de páginas.

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Request Body:
```json
{
  "pages": { "start": 2, "end": 6 },
  "query": "énfasis en definiciones",
  "num_questions": 10
}
```

Response 200 (fragmento):
```md
1) ¿Cuál es la definición de ...?
   - A) ...
   - B) ...
   - C) ...
   - D) ...
   Correcta: B
   Justificación: ...
   Páginas: 3–4
```

#### POST `/documents/{document_id}/file/signed-url`
Obtener una URL firmada de corta duración para embeber el PDF en un iframe (sin cookies) y permitir abrir en página específica.

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Response 200:
```json
{
  "url": "/documents/{id}/file/signed?token=...",
  "expires_at": 1738695220
}
```

Notas:
- El visor del frontend puede anexar `#page=N&toolbar=1&navpanes=0` al final para abrir en la página N.
- Seguridad: X-Frame-Options/CSP permiten iframing únicamente en rutas `/documents/{id}/file` y `/documents/{id}/file/signed`.

#### DELETE `/documents/{document_id}`
Eliminar un documento y todos sus datos asociados.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "message": "Documento eliminado exitosamente",
  "deleted_items": {
    "document": 1,
    "chunks": 87,
    "embeddings": 87,
    "conversations": 2,
    "messages": 15
  }
}
```

### 5.4 Chat y RAG

#### POST `/chat/{document_id}`
Hacer una pregunta sobre un documento específico.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "¿Cuáles son los beneficios principales de la IA?",
  "conversation_id": 456  // Opcional, para continuar conversación
}
```

**Response (200):**
```json
{
  "conversation_id": 456,
  "message_id": 789,
  "response": "Según el documento, los principales beneficios de la IA incluyen...",
  "citations": [
    {
      "chunk_id": 12,
      "page_number": 15,
      "content": "Los estudios demuestran que la IA puede reducir costos operativos hasta un 40%...",
      "relevance_score": 0.95,
      "start_char": 1250,
      "end_char": 1450
    },
    {
      "chunk_id": 23,
      "page_number": 28,
      "content": "Netflix reportó ahorros anuales de $1B gracias a sus sistemas de IA...",
      "relevance_score": 0.87,
      "start_char": 2100,
      "end_char": 2300
    }
  ],
  "token_usage": {
    "prompt_tokens": 1250,
    "completion_tokens": 340,
    "total_tokens": 1590
  },
  "processing_time_ms": 2450,
  "created_at": "2025-09-14T16:15:00Z"
}
```

#### GET `/chat/conversations/{document_id}`
Obtener historial de conversaciones de un documento.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "document_id": 123,
  "conversations": [
    {
      "conversation_id": 456,
      "created_at": "2025-09-14T16:10:00Z",
      "messages": [
        {
          "id": 788,
          "role": "user",
          "content": "¿De qué trata este documento?",
          "created_at": "2025-09-14T16:10:00Z"
        },
        {
          "id": 789,
          "role": "assistant",
          "content": "Este documento trata sobre...",
          "citations": [...],
          "created_at": "2025-09-14T16:10:05Z"
        }
      ]
    }
  ],
  "total_conversations": 1
}
```

### 5.5 Estadísticas y Uso

#### GET `/auth/profile/stats`
Obtener estadísticas detalladas del usuario.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "user_id": 1,
  "statistics": {
    "documents": {
      "total": 15,
      "by_status": {
        "indexed": 12,
        "processing": 1,
        "pending": 1,
        "failed": 1
      },
      "by_type": {
        "pdf": 8,
        "docx": 4,
        "pptx": 2,
        "txt": 1
      }
    },
    "conversations": {
      "total": 45,
      "messages_sent": 127,
      "messages_received": 127
    },
    "storage": {
      "total_bytes": 52428800,
      "total_mb": 50.0,
      "largest_file_mb": 8.5
    },
    "tokens": {
      "total_consumed": 125000,
      "remaining": 25000,
      "last_reset": "2025-09-01T00:00:00Z"
    },
    "activity": {
      "last_login": "2025-09-14T15:45:00Z",
      "last_upload": "2025-09-14T16:00:00Z",
      "last_chat": "2025-09-14T16:15:00Z"
    }
  },
  "generated_at": "2025-09-14T16:20:00Z"
}
```

### 5.6 Sistema y Health Checks

#### GET `/health`
Verificar estado de la API.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "docai-api",
  "version": "1.0.0",
  "timestamp": "2025-09-14T16:25:00Z",
  "dependencies": {
    "database": "connected",
    "gemini_api": "available",
    "storage": "accessible"
  }
}
```

#### GET `/`
Información básica de la API.

**Response (200):**
```json
{
  "service": "DocAI API",
  "version": "1.0.0",
  "description": "API para análisis inteligente de documentos con IA",
  "documentation": "/docs",
  "health": "/health"
}
```

### 5.7 Códigos de Error

#### Errores de Autenticación:
- **401 Unauthorized:** Token inválido o expirado
- **403 Forbidden:** Sin permisos para el recurso

#### Errores de Validación:
- **400 Bad Request:** Datos de entrada inválidos
- **422 Unprocessable Entity:** Error de validación de esquema

#### Errores de Recursos:
- **404 Not Found:** Recurso no encontrado
- **409 Conflict:** Conflicto (ej. email ya existe)
- **402 Payment Required:** Límite de plan/cuota alcanzado (p. ej., invitado excede `GUEST_MAX_DOCUMENTS` en `/documents/upload`)

#### Errores del Servidor:
- **429 Too Many Requests:** Rate limit excedido
- **500 Internal Server Error:** Error interno del servidor
- **503 Service Unavailable:** Servicio temporalmente no disponible

#### Ejemplo de Respuesta de Error:
```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "El documento especificado no existe o no tienes acceso",
    "details": {
      "document_id": 999,
      "user_id": 1
    },
    "timestamp": "2025-09-14T16:30:00Z"
  }
}
```

---

## 5.x Exportaciones

#### POST `/exports/artifacts/export`
Exportar artefactos (por ahora, guías de estudio) a PDF/DOCX/TXT.

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Request Body:
```json
{
  "document_id": "<doc-id>",
  "artifact_type": "study_guide",
  "export_type": "pdf",       // pdf | docx | txt
  "source_format": "markdown", // markdown | json
  "title": "Guia_estudio_MiDocumento",
  "content": "## Guía de estudio..." // o JSON estructurado
}
```

Response 200:
```json
{
  "success": true,
  "filename": "Guia_estudio_MiDocumento.pdf",
  "file_size": 123456,
  "download_url": "/api/exports/download/Guia_estudio_MiDocumento.pdf",
  "export_id": "..."
}
```

#### GET `/exports/download/{filename}`
Descargar el archivo exportado. El media-type se infiere por extensión (`.pdf`, `.docx`, `.txt`).

## 6. Arquitectura del Sistema

### 6.1 Diagrama de Arquitectura General

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Frontend      │    │     Backend      │    │     Worker      │
│   (Next.js)     │◄──►│    (FastAPI)     │◄──►│   (Python)      │
│   Port: 3000    │    │   Port: 8000     │    │  Background     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   CDN/Static    │    │    Database      │    │   File Storage  │
│    Assets       │    │  (SQLite/PgSQL)  │    │   (Local/S3)    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │                  │
                       │   External APIs  │
                       │   (Gemini AI)    │
                       │                  │
                       └──────────────────┘
```

### 6.2 Flujo de Datos Completo

#### Flujo de Upload y Procesamiento:
```
1. Usuario → Frontend (Upload UI)
   │
   ▼
2. Frontend → Backend (/documents/upload)
   │
   ▼
3. Backend → File System (guardar archivo)
   │
   ▼
4. Backend → Database (crear registro)
   │
   ▼
5. Backend → Worker Queue (disparar procesamiento)
   │
   ▼
6. Worker → Document Processor
   │
   ▼ 
7. Document Processor → Text Extraction
   │
   ▼
8. Document Processor → Chunking
   │
   ▼
9. Document Processor → Gemini API (embeddings)
   │
   ▼
10. Document Processor → Database (guardar chunks + embeddings)
    │
    ▼
11. Database → status = 'indexed'
```

### 6.x UI – Mapas y Guías (How‑to + Capturas)

Esta sección muestra cómo generar y utilizar Guías de Estudio, Mapas Mentales y Cuestionarios, y cómo interactuar con el visor de documentos.

Cómo generar
- Desde Visor/Resumen/Chat: usa los botones “Guía de estudio”, “Mapa mental” o “Cuestionario”.
- Rango de páginas: opcional; si vienes desde Chat con citas, se prellenan automáticamente (min/max páginas citadas).
- Enfoque: texto libre (ej. “definiciones clave”) y modo (`definitions|processes|actors|timeline`) en el caso de mapa mental.
- Detalle del mapa: 1..3 controla el número de nodos (6/10/14 aprox.).
- Generar: procesa con IA y muestra una vista previa.

Interacciones (Mapa mental)
- Vista Conceptual (default):
  - Pan/zoom (barra superior), Ajustar, PNG, minimapa.
  - Tooltip: snippet + páginas (si disponibles). Las etiquetas no muestran páginas.
  - Click del nodo: abre el visor PDF en la página detectada.
- Vista Mermaid:
  - Zoom/Ajustar, SVG/PNG.
  - Tooltips y click a página iguales.

Persistencia de preferencia (por documento)
- Se recuerda: detalle, enfoque, páginas, vista (concept/mermaid) y zoom (solo conceptual). Se guarda localmente.

Buenas prácticas
- Exportar SVG (Mermaid) para diagramas vectoriales en reportes.
- Exportar PNG (Conceptual) si necesitas raster para slides.

Capturas (añadir imágenes en `apps/web/public/docs/`)
- Vista Conceptual: `![Mindmap Concept](./docs/mindmap-concept.png)`
- Vista Mermaid: `![Mindmap Mermaid](./docs/mindmap-mermaid.png)`
- Guía de Estudio: `![Study Guide Modal](./docs/study-guide-modal.png)`
- Cuestionario: `![Quiz Modal](./docs/quiz-modal.png)`

TODO: subir las imágenes a `apps/web/public/docs/` con los nombres indicados.

#### Flujo de Chat RAG:
```
1. Usuario pregunta → Frontend (Chat UI)
   │
   ▼
2. Frontend → Backend (/chat/{document_id})
   │
   ▼
3. Backend → RAG Service
   │
   ▼
4. RAG Service → Gemini API (embedding de pregunta)
   │
   ▼
5. RAG Service → Database (búsqueda vectorial)
   │
   ▼
6. RAG Service → Context Builder (chunks relevantes)
   │
   ▼
7. RAG Service → Gemini API (generación de respuesta)
   │
   ▼
8. RAG Service → Citation Extractor
   │
   ▼
9. Backend → Frontend (respuesta + citas)
   │
   ▼
10. Frontend → Usuario (mostrar respuesta con citas)
```

### 6.3 Componentes del Sistema

#### Frontend (Next.js 15):
| Directorio | Descripción | Responsabilidades |
|------------|-------------|-------------------|
| `src/app/` | App Router pages | Rutas y layouts |
| `src/components/` | Componentes React | UI reutilizable |
| `src/lib/` | Utilidades | HTTP client, auth, utils |
| `src/styles/` | CSS global | Tailwind, CSS modules |

#### Backend (FastAPI):
| Módulo | Descripción | Responsabilidades |
|--------|-------------|-------------------|
| `routers/` | Endpoints API | Rutas HTTP organizadas |
| `services/` | Lógica de negocio | RAG, auth, procesamiento |
| `models/` | Modelos SQLAlchemy | Esquema de base de datos |
| `utils/` | Utilidades | JWT, validación, helpers |

#### Worker (Python):
| Archivo | Descripción | Responsabilidades |
|---------|-------------|-------------------|
| `worker.py` | Worker principal | Cola de trabajos |
| `document_processor.py` | Procesador | Extracción, chunking, embeddings |
| `extractors/` | Extractores específicos | PDF, DOCX, PPTX, TXT |

### 6.4 Base de Datos - Relaciones

```sql
users (1) ────────────── (N) documents
  │                         │
  │                         │
  └─── (N) conversations ───┘
          │
          │
          └── (N) messages
          
documents (1) ──────────── (N) doc_chunks
                              │
                              │
                              └── (1) doc_embeddings
```

#### Índices Clave para Performance:
```sql
-- Índices para búsquedas frecuentes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_doc_chunks_document_id ON doc_chunks(document_id);
CREATE INDEX idx_conversations_user_document ON conversations(user_id, document_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Índice compuesto para paginación
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);
```

### 6.5 Seguridad - Arquitectura

#### Capas de Seguridad:

1. **Frontend:**
   - JWT tokens en localStorage
   - Validación de formularios
   - HTTPS enforcement
   - CSRF protection headers

2. **Backend:**
   - JWT authentication middleware
   - Rate limiting por IP/usuario
   - Input validation con Pydantic
   - CORS configurado específicamente

3. **Base de Datos:**
   - Consultas parametrizadas (SQLAlchemy)
   - User isolation (filtros por user_id)
   - Password hashing con bcrypt

4. **Externa:**
   - API keys en variables de entorno
   - File uploads con validación
   - Límites de tamaño y formato

### 6.6 Escalabilidad - Consideraciones

#### Desarrollo (Estado Actual):
- **Frontend:** Single instance en Vercel
- **Backend:** Single process con uvicorn
- **Database:** SQLite local
- **Worker:** Single process background
- **Storage:** Sistema de archivos local

#### Producción (Recomendado):
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CDN (Vercel)  │    │  Load Balancer   │    │ Worker Cluster  │
│   ┌───────────┐ │    │  ┌─────────────┐ │    │ ┌─────────────┐ │
│   │Frontend   │ │    │  │Backend API  │ │    │ │Worker 1     │ │
│   │Instances  │ │    │  │Instances    │ │    │ │Worker 2     │ │
│   └───────────┘ │    │  └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                 ┌──────────────────────────────────────────┐
                 │           Shared Resources               │
                 │ ┌─────────────────┐ ┌─────────────────┐  │
                 │ │ PostgreSQL +    │ │ Redis Queue +   │  │
                 │ │ pgvector        │ │ Session Store   │  │
                 │ └─────────────────┘ └─────────────────┘  │
                 │ ┌─────────────────┐ ┌─────────────────┐  │
                 │ │ S3/R2 Storage   │ │ Monitoring      │  │
                 │ │ (Files)         │ │ (Logs/Metrics)  │  │
                 │ └─────────────────┘ └─────────────────┘  │
                 └──────────────────────────────────────────┘
```

#### Puntos de Escalabilidad:

1. **Horizontal Scaling:**
   - Múltiples instancias de Backend API
   - Worker pool con Redis/RabbitMQ
   - CDN para assets estáticos

2. **Database Scaling:**
   - PostgreSQL con replicas de lectura
   - pgvector para búsqueda vectorial optimizada
   - Connection pooling

3. **Caching Strategy:**
   - Redis para sesiones y cache
   - CDN para archivos estáticos
   - Query result caching

4. **Monitoring:**
   - Application metrics (Prometheus)
   - Log aggregation (ELK stack)
   - Error tracking (Sentry)
   - Uptime monitoring

---

## 7. Despliegue y Producción

### 7.1 Estrategia de Despliegue

#### Entornos Recomendados:

| Entorno | Propósito | Configuración |
|---------|-----------|---------------|
| **Development** | Desarrollo local | SQLite, localhost |
| **Staging** | Testing y QA | PostgreSQL, servicios cloud |
| **Production** | Usuarios finales | Multi-región, alta disponibilidad |

### 7.2 Servicios Cloud Recomendados

#### Opción 1: All-in-One (Supabase + Vercel)
```yaml
Frontend:
  service: Vercel
  plan: Pro ($20/mes)
  features: 
    - Deploy automático desde Git
    - CDN global
    - Edge functions

Backend + Database:
  service: Supabase
  plan: Pro ($25/mes)
  features:
    - PostgreSQL con pgvector
    - Auth built-in
    - Edge functions
    - Storage integrado

Worker:
  service: Railway/Render
  plan: Hobby ($5/mes)
  features:
    - Deploy desde Git
    - Auto-scaling básico
    - Environment variables
```

#### Opción 2: Especializada (Mejor performance)
```yaml
Frontend:
  service: Vercel
  plan: Pro ($20/mes)

Backend:
  service: Railway/Render
  plan: Pro ($25/mes)

Database:
  service: Neon/PlanetScale
  plan: Pro ($35/mes)
  features: 
    - PostgreSQL serverless
    - Auto-scaling
    - Branching

Storage:
  service: Cloudflare R2
  plan: Pay-as-you-go (~$5/mes)

Worker:
  service: Railway
  plan: Hobby ($10/mes)
```

### 7.3 Variables de Entorno - Producción

#### Frontend (.env.local):
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.docai.com
NEXT_PUBLIC_ENVIRONMENT=production

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

#### Backend (.env):
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/docai_prod
REDIS_URL=redis://user:pass@host:6379

# JWT Security
SECRET_KEY=super_secure_random_key_256_bits
JWT_EXPIRATION_HOURS=24

# AI APIs
GEMINI_API_KEY=your_production_gemini_key

# Storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=docai-prod-files
AWS_REGION=us-east-1

# External Services
STRIPE_SECRET_KEY=sk_live_xxx
SENTRY_DSN=https://xxx@sentry.io/xxx

# App Configuration
ALLOWED_ORIGINS=https://docai.com,https://www.docai.com
MAX_FILE_SIZE=104857600  # 100MB
RATE_LIMIT_PER_MINUTE=120
```

### 7.4 Docker Configuration

#### Dockerfile (Backend):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### docker-compose.prod.yml:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/docai
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  worker:
    build: .
    command: python worker/worker.py
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/docai
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=docai
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 7.5 CI/CD Pipeline

#### GitHub Actions (.github/workflows/deploy.yml):
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd apps/api
          pip install -r requirements.txt
          
      - name: Run tests
        run: |
          cd apps/api
          pytest tests/

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./apps/web

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway up --service backend --path apps/api
```

### 7.6 Monitoreo y Observabilidad

#### Métricas Clave a Monitorear:

1. **Application Metrics:**
   - Request latency (p50, p95, p99)
   - Error rate por endpoint
   - Throughput (requests/second)
   - Active users simultáneos

2. **Business Metrics:**
   - Documentos procesados por día
   - Preguntas RAG por usuario
   - Tiempo de procesamiento promedio
   - Tasa de conversión free → premium

3. **Infrastructure Metrics:**
   - CPU/Memory utilization
   - Database connections
   - Storage usage
   - Network I/O

#### Configuración de Alertas:
```yaml
# alerts.yml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    
  - name: High Latency
    condition: p95_latency > 2s
    duration: 10m
    severity: warning
    
  - name: Database Connections
    condition: db_connections > 80%
    duration: 5m
    severity: warning
    
  - name: Storage Usage
    condition: storage_usage > 90%
    duration: 1h
    severity: critical
```

---

## 8. Seguridad

### 8.1 Análisis de Seguridad Actual

#### ✅ Implementado (Seguridad Básica):
- **Autenticación JWT** con tokens de 30 minutos
- **Hash de contraseñas** con bcrypt (rounds: 12)
- **CORS configurado** para dominios específicos
- **Validación de archivos** por tipo y tamaño
- **Validación de entrada** con Pydantic schemas
- **User isolation** en queries de base de datos
- **Bearer token** en todas las rutas protegidas

#### ⚠️ Vulnerabilidades Identificadas:

##### Críticas (Requieren atención inmediata):
1. **Secret Key por defecto** - JWT usa clave no segura en desarrollo
2. **Token en localStorage** - Vulnerable a XSS, considerar httpOnly cookies
3. **Sin headers de seguridad** - Falta CSP, X-Frame-Options, HSTS
4. **Sin rate limiting** - API vulnerable a ataques de fuerza bruta
5. **Sin sanitización XSS** - Content no sanitizado en frontend

##### Importantes (Para producción):
6. **Uploads sin escaneo** - Archivos no validados contra malware
7. **Sin CSRF protection** - Tokens no protegidos contra CSRF
8. **Sin logging de seguridad** - No hay auditoría de accesos
9. **Sin 2FA** - Autenticación de un solo factor
10. **Sin WAF** - No hay firewall de aplicación web

### 8.2 Plan de Hardening de Seguridad

#### Fase 1: Crítico (Antes de producción)

##### 1.1 JWT Security Hardening:
```python
# apps/api/utils/security.py
import secrets
import os
from datetime import datetime, timedelta

class SecurityConfig:
    # Generar secret key segura (256 bits)
    SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
    
    # Configuración JWT más segura
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = 15  # Reducir tiempo de vida
    JWT_REFRESH_EXPIRATION_DAYS = 7
    
    # Blacklist de tokens (Redis)
    JWT_BLACKLIST_ENABLED = True
    
    @staticmethod
    def generate_secure_token():
        """Generar token seguro para producción"""
        return secrets.token_urlsafe(64)
```

##### 1.2 Security Headers:
```python
# apps/api/main.py - Middleware de seguridad
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "*.docai.com"]
)

---

## 12. Recomendaciones para Generación de PDF

Esta sección ofrece una guía de buenas prácticas para la creación de documentos PDF profesionales, claros y accesibles, especialmente cuando se generan a partir de ficheros Markdown como este.

### 12.1 Tipografía

La elección de la tipografía es crucial para la legibilidad y la apariencia profesional del documento.

- **Fuente para Títulos (Headings):**
  - **Recomendación:** Usar una fuente **Sans-serif** (sin remates) como *Lato*, *Open Sans*, *Roboto* o *Helvetica*.
  - **Razón:** Aportan un aspecto moderno, limpio y son muy legibles en tamaños grandes.
  - **Ejemplo de Jerarquía:**
    - `H1`: 32pt, Bold
    - `H2`: 24pt, Bold
    - `H3`: 18pt, Bold

- **Fuente para Cuerpo de Texto (Body):**
  - **Recomendación:** Usar una fuente **Serif** (con remates) como *Garamond*, *Georgia* o *Merriweather*.
  - **Razón:** Las serifas guían el ojo y mejoran la legibilidad en bloques largos de texto impreso o en PDF.
  - **Tamaño:** Entre **10pt y 12pt** es ideal para la mayoría de los lectores.

- **Fuente para Bloques de Código:**
  - **Recomendación:** Usar una fuente **Monoespaciada** como *Fira Code*, *Source Code Pro* o *Consolas*.
  - **Razón:** Asegura que todos los caracteres tengan el mismo ancho, lo cual es fundamental para la alineación y legibilidad del código.
  - **Tamaño:** Ligeramente más pequeño que el cuerpo de texto, por ejemplo, **9pt o 10pt**.

- **Interlineado (Line Spacing):**
  - **Recomendación:** Un valor entre **1.3 y 1.5** (130% a 150% del tamaño de la fuente).
  - **Razón:** Proporciona suficiente espacio en blanco entre líneas para evitar que el texto se sienta denso y fatigante de leer.

### 12.2 Estructura del Texto

Una estructura clara permite al lector escanear el documento y encontrar información rápidamente.

- **Jerarquía Visual:**
  - Usa un sistema de encabezados (`H1`, `H2`, `H3`...) consistente. La diferencia de tamaño y peso entre ellos debe ser notoria.
  - Mantén los márgenes amplios (ej. 2.5 cm o 1 pulgada) para dar "aire" al contenido.

- **Párrafos y Columnas:**
  - **Longitud de línea:** Evita líneas de texto demasiado largas. El ideal está entre **60 y 80 caracteres por línea**. En una página A4, esto a menudo se logra con márgenes generosos o usando un diseño de dos columnas para textos muy densos.
  - **Alineación:** Justifica el texto a la izquierda (`ragged right`). El texto completamente justificado puede crear "ríos" de espacio en blanco que dificultan la lectura, a menos que se use un software de maquetación profesional con buena separación de sílabas.

- **Uso de Énfasis:**
  - **Negrita (Bold):** Para resaltar términos clave o frases importantes que requieren atención inmediata.
  - **Cursiva (Italics):** Para énfasis sutil, títulos de obras, o para introducir términos nuevos.
  - **Subrayado:** Evítalo. En el contexto digital, el subrayado se asocia universalmente con hipervínculos.

### 12.3 Elementos Gráficos

Los gráficos deben complementar y clarificar el texto, no simplemente decorar.

- **Diagramas y Esquemas:**
  - **Estilo Consistente:** Usa la misma paleta de colores, grosor de línea y tipografía en todos los diagramas.
  - **Claridad:** Deben ser simples y autoexplicativos. Etiqueta todas las partes importantes.
  - **Formato:** Exporta los diagramas en formato vectorial (**SVG**) siempre que sea posible. Para el PDF, conviértelos a **PNG de alta resolución (300 DPI)** para asegurar que se vean nítidos al imprimir o hacer zoom.

- **Capturas de Pantalla (Screenshots):**
  - **Resolución:** Deben ser nítidas y legibles. Evita redimensionarlas de forma desproporcionada.
  - **Anotaciones:** Usa recuadros, flechas o texto superpuesto para señalar elementos específicos. Mantén un estilo de anotación consistente.
  - **Bordes y Sombras:** Añadir un borde sutil o una sombra ligera puede ayudar a separar las capturas del resto del contenido.

- **Tablas:**
  - **Simplicidad:** Evita el exceso de bordes. A menudo, solo las líneas horizontales son suficientes para guiar la vista.
  - **Relleno de Celda:** Asegúrate de que haya suficiente espacio (padding) dentro de las celdas para que el texto no toque los bordes.
  - **Alineación:** Alinea los datos numéricos a la derecha y el texto a la izquierda para facilitar la comparación.

- **Paleta de Colores:**
  - **Limitada y Funcional:** Usa una paleta de 2-3 colores principales. Un color para los títulos, otro para el texto y un color de acento para enlaces o elementos destacados.
  - **Contraste:** Asegura un alto contraste entre el texto y el fondo (ej. negro sobre blanco). Usa herramientas online para verificar el ratio de contraste y asegurar la accesibilidad (WCAG).
  - **Consideración Monocromática:** Diseña pensando en que el documento podría imprimirse en blanco y negro. La información no debe depender únicamente del color.
\n+---
\n+## Anexo – Actualización 29/09/2025 (Fase 1 Seguridad + Demo Mode)

Resumen de cambios implementados para la presentación en conferencia. Este bloque documenta flags, endpoints, UI y pasos de uso para identificar rápidamente lo añadido/modificado.

### Cambios Clave Backend
- Autenticación por cookies httpOnly
  - `POST /auth/login`: setea cookie `access_token` (httpOnly, `SameSite=Lax`, `Secure` según entorno).
  - `POST /auth/refresh`: rota token y reescribe cookie (invalida la anterior).
  - `POST /auth/logout`: invalida token y elimina cookie.
  - `get_current_user`: acepta `Authorization: Bearer` o cookie (transición segura).
- Seguridad y límites
  - Middleware de headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`; `Strict-Transport-Security` en prod/demo.
  - CSP opcional vía `ENABLE_CSP_STRICT` (API con política restrictiva en prod/demo).
  - Rate limiting in-memory (ventana 60s) con cabeceras `X-RateLimit-*`:
    - `/auth/login` (`RATE_LIMIT_LOGIN_PER_MIN`)
    - `/documents/upload` (`RATE_LIMIT_UPLOAD_PER_MIN`)
    - Prefijo `/chat` (`RATE_LIMIT_CHAT_PER_MIN`)
- Validación de archivos
  - Verificación de firma/magic bytes: PDF (`%PDF-`), DOCX/PPTX (ZIP `PK\x03\x04`), TXT (UTF‑8 decodificable).
  - Antivirus opcional con `ENABLE_FILE_AV_SCAN` (stub preparado para integrar ClamAV u otro).
- Configuración centralizada
  - Archivo: `apps/api/config.py` (lee flags desde `.env`).

### Demo Mode
- Flags
  - `DEMO_PUBLIC` (activa modo demo y hardening asociado)
  - `DEMO_REGISTRATION_ENABLED` (habilitar/deshabilitar registro público)
  - `DEMO_AUTO_CLEAN_HOURS` (limpieza automática cada N horas; 0 desactiva)
  - `DEMO_WHITELIST_EMAILS` (lista de correos permitidos para administración)
- Limpieza de datos
  - Tarea periódica: `apps/api/demo.py` (borra usuarios NO whitelisted y todos sus datos + ficheros en `uploads/` y `profile_pics/`).
  - Endpoint admin inmediato: `POST /admin/demo/reset` (requiere `DEMO_PUBLIC=true` y usuario en whitelist).
- Semillas de demo
  - Script: `python scripts/seed_demo.py`
  - Crea usuarios `demo1@docai.local`, `demo2@docai.local` (pass: `demo1234`) y documentos “indexed” con chunks.

### Cambios Clave Frontend
- Migración a cookies
  - Todas las llamadas protegidas usan `fetch(..., { credentials: 'include' })`.
  - Eliminado el uso de `localStorage` para tokens.
- Avisos y señalización de Demo
  - Badges “Demo Mode” y banners informativos en: Landing, Login, Registro, Dashboard (header y footer), Documents, Viewer, Summary, Chat (selector y por documento) y Upload.
  - Página de política: `/docs/demo`; enlazada desde banners y footer global.
- QR para acceso móvil
  - `NEXT_PUBLIC_PUBLIC_URL` + `NEXT_PUBLIC_ENABLE_QR=true`.
  - Componente modal `QrButton` (landing y dashboard) con QR embebido y tooltip.
- Reset Demo (UI)
  - Botón en el header del Dashboard (solo visible si `NEXT_PUBLIC_SHOW_DEMO_RESET=true` y el email del usuario está en `NEXT_PUBLIC_DEMO_ADMIN_EMAILS`).

### Variables de Entorno Nuevas/Relevantes
- Backend
  - `ENABLE_CSP_STRICT`, `RATE_LIMIT_ENABLED`
  - `RATE_LIMIT_LOGIN_PER_MIN`, `RATE_LIMIT_UPLOAD_PER_MIN`, `RATE_LIMIT_CHAT_PER_MIN`
  - `ENABLE_FILE_AV_SCAN`
  - `COOKIE_SAMESITE` (Lax), `COOKIE_SECURE` (true en prod/demo)
  - `PROVIDER_LLM`, `PROVIDER_EMBEDDINGS`
  - `DEMO_PUBLIC`, `DEMO_REGISTRATION_ENABLED`, `DEMO_AUTO_CLEAN_HOURS`, `DEMO_WHITELIST_EMAILS`
- Frontend
  - `NEXT_PUBLIC_PUBLIC_URL`, `NEXT_PUBLIC_ENABLE_QR`
  - `NEXT_PUBLIC_DEMO_PUBLIC`
  - `NEXT_PUBLIC_SHOW_DEMO_RESET`, `NEXT_PUBLIC_DEMO_ADMIN_EMAILS`

### Configuración Recomendada – Demo Online
- Backend (`.env`):
```
DEMO_PUBLIC=true
DEMO_REGISTRATION_ENABLED=false
DEMO_AUTO_CLEAN_HOURS=2
DEMO_WHITELIST_EMAILS=tu_admin@tu.dominio
ENABLE_CSP_STRICT=true
RATE_LIMIT_ENABLED=true
ENABLE_FILE_AV_SCAN=true
COOKIE_SECURE=true
```
- Frontend (`.env`):
```
NEXT_PUBLIC_DEMO_PUBLIC=true
NEXT_PUBLIC_PUBLIC_URL=https://tudominio
NEXT_PUBLIC_ENABLE_QR=true
NEXT_PUBLIC_SHOW_DEMO_RESET=true
NEXT_PUBLIC_DEMO_ADMIN_EMAILS=tu_admin@tu.dominio
```
- Semillas y arranque
  - `python scripts/seed_demo.py`
  - Arrancar API, Worker y Web (puertos 8000/3000) y verificar login con cuenta demo.

### Consideraciones Localhost
- Cookies: `SameSite=Lax`, `Secure=false` en dev; CORS con `allow_credentials=True`.
- Frontend usa `credentials: 'include'` en todas las peticiones.

### Endpoints Nuevos/Actualizados
- `/auth/login` (set-cookie), `/auth/refresh`, `/auth/logout`
- `/admin/demo/reset` (admin whitelisted, solo en demo)

### Checklist Rápido de Validación
- Login → cookie httpOnly presente → `/auth/me` OK.
- Upload válido/ inválido (firma MIME) → 200/400 según corresponda.
- Límites → 429 tras exceder umbral en login/upload/chat.
- Limpieza demo: ejecutar `POST /admin/demo/reset` con admin whitelisted.
- UI: ver badges/avisos Demo + QR en landing y dashboard; footer con enlace a “Política de Demo”.
### 8.1 CSRF (Cross-Site Request Forgery)

Se implementó protección CSRF para todas las peticiones mutadoras (POST/PUT/PATCH/DELETE) usando el patrón Double-Submit Cookie + Header y validación de `Origin/Referer`.

- Flujo:
  - Al iniciar sesión o refrescar (`POST /auth/login`, `POST /auth/refresh`), el backend emite una cookie `XSRF-TOKEN` (no httpOnly) con un token firmado.
  - El frontend debe leer esa cookie y enviar su valor en el header `x-csrf-token` en cada petición mutadora, siempre con `credentials: 'include'`.
  - El backend valida que el método sea mutador, que `Origin/Referer` pertenezca a un origen permitido, que la cookie y el header coincidan y que la firma sea válida.

- Variables de entorno relevantes:
  - `CSRF_ENABLED` (bool): habilita la verificación. Mantener `true` en prod/demo.
  - `CSRF_COOKIE_NAME` (default `XSRF-TOKEN`), `CSRF_HEADER_NAME` (default `x-csrf-token`).
  - `CSRF_SAMESITE` (default `Lax`), `CSRF_MAX_AGE_SECONDS` (default `86400`).
  - `CSRF_SECRET_KEY` (opcional; si no se define, se usa `JWT_SECRET_KEY`).
  - `CSRF_ALLOWED_ORIGINS`: lista separada por comas de orígenes adicionales (por defecto incluye `http://localhost:3000`).

- Frontend (Next.js) – ejemplo mínimo:
  ```ts
  // Añadir en cada fetch mutador
  const token = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['x-csrf-token'] = decodeURIComponent(token);
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ruta`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });
  ```

- Rutas excluidas:
  - `OPTIONS`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/register`.

- Comportamiento y pruebas:
  - Sin header o sin cookie → 403 (Missing CSRF token).
  - Header ≠ cookie → 403 (CSRF token mismatch).
  - `Origin/Referer` no permitido → 403.
  - Con header correcto y origen permitido → 2xx.
### 4.9 Evaluación de Respuestas (RAG Eval)

Para validar la calidad de respuestas y detectar posibles problemas (alucinaciones, citas incorrectas, cobertura insuficiente), se incluye un script de evaluación offline:

- Script: `scripts/rag_eval.py`
- Dataset opcional: `eval/qa_example.jsonl` (formato JSONL: `{document_id, question, expected?}`)

Formas de uso:

- Sin etiquetas (solo preguntas):
```
python scripts/rag_eval.py --document-id <DOC_ID> \
  --question "¿De qué trata el documento?" \
  --question "Punto clave A?" \
  --out eval_report.json
```

- Con etiquetas (expected):
```
python scripts/rag_eval.py --jsonl eval/qa_example.jsonl --out eval_report.json
```

El reporte incluye:
- `support.ratio`: proporción de oraciones de la respuesta que tienen suficiente superposición léxica con el contexto recuperado (indicador de apoyo textual).
- `scores.f1` (si hay `expected`): F1 de tokens simple respecto a la respuesta esperada.
- `citations`: citas devueltas por el sistema para revisión manual.

Uso recomendado:
- Crea tu propio JSONL con las preguntas conocidas y (opcionalmente) respuestas esperadas.
- Revisa `avg_support_ratio` y `avg_f1` en el reporte. Oraciones marcadas como `supported=false` merecen inspección manual (posible alucinación o formulación no literal).
