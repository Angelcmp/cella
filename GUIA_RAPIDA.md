# 🚀 DocAI - Guía Rápida de Uso

## 🔧 Cómo Iniciar la Aplicación

### 1. Iniciar Backend (API)
```bash
# Terminal 1 - API en puerto 8000
cd /home/angel/DocAI
python apps/api/main.py
```
**Status:** Verás `🚀 Starting DocAI API...` y `✅ Database tables created/verified`

### 2. Iniciar Frontend 
```bash
# Terminal 2 - Frontend en puerto 3000
cd /home/angel/DocAI/apps/web
npm run dev
```
**Status:** Verás `✓ Ready in XXXXms` y la URL `http://localhost:3000`

### 3. Iniciar Worker (Opcional)
```bash
# Terminal 3 - Procesamiento de documentos
python /home/angel/DocAI/apps/worker/worker.py
```

---

## 🌐 URLs de la Aplicación

| Página | URL | Descripción |
|--------|-----|-------------|
| **Landing** | http://localhost:3000 | Página principal (estilo Anthropic) |
| **Registro** | http://localhost:3000/auth/register | Crear cuenta nueva |
| **Login** | http://localhost:3000/auth/login | Iniciar sesión |
| **Dashboard** | http://localhost:3000/dashboard | Panel principal del usuario |
| **📤 Upload** | http://localhost:3000/dashboard/upload | Subir documentos |
| **📋 Documentos** | http://localhost:3000/dashboard/documents | Gestionar documentos |
| **💬 Chat** | http://localhost:3000/dashboard/chat | Selector de documentos para chat |
| **💬 Chat Activo** | http://localhost:3000/dashboard/chat/[ID] | Chat con documento específico |
| **API Docs** | http://localhost:8000/docs | Documentación Swagger de la API |
| **API Health** | http://localhost:8000/health | Estado de la API |

---

## 👤 Cómo Crear Cuenta y Usar la App

### Paso 1: Registrarse
1. Ve a http://localhost:3000
2. Clic en **"Registrarse"**
3. Llena el formulario:
   - **Email:** cualquier email (ej: `test@docai.com`)
   - **Contraseña:** mínimo 6 caracteres (ej: `test123`)
   - **Confirmar:** repite la contraseña
4. Clic **"Crear Cuenta"**
5. Te redirige automáticamente al login

### Paso 2: Iniciar Sesión
1. En http://localhost:3000/auth/login
2. Usa las credenciales que acabas de crear
3. Clic **"Iniciar Sesión"**
4. Te lleva automáticamente al dashboard

### Paso 3: Usar el Dashboard
En http://localhost:3000/dashboard verás:

**📊 Estadísticas:**
- Número de documentos
- Créditos restantes (empiezas con 50)
- Plan actual (Free)

**📤 Subir Documentos:**
- Haz clic en el área de upload
- Selecciona archivo (PDF, DOCX, PPTX, TXT)
- Se sube automáticamente
- Ve el estado: Pendiente → Procesando → Listo

**📋 Gestionar Documentos:**
- Lista de todos tus documentos
- Estados con badges de color
- Botón "Chat" cuando está listo
- Botón eliminar (🗑️)

---

## 🧪 Prueba Rápida - 2 Minutos

```bash
# 1. Iniciar servicios
cd /home/angel/DocAI
python apps/api/main.py &
cd apps/web && npm run dev &

# 2. Abrir navegador
# http://localhost:3000

# 3. Flujo completo:
# Landing → Registrarse → Login → Dashboard → Upload → ¡Listo!
```

---

## 🔑 Credenciales de Ejemplo

Para pruebas rápidas, puedes usar estas credenciales:

| Campo | Valor |
|-------|-------|
| **Email** | `demo@docai.com` |
| **Contraseña** | `demo123` |

*Nota: Si no existen, regístrate primero con estos datos*

---

## 📁 Archivos de Prueba

Puedes usar estos archivos para probar:
- `/home/angel/DocAI/test_document.txt` (ya existe)
- Cualquier PDF que tengas
- Cualquier documento Word (.docx)

---

## 🚨 Solución de Problemas

### API no funciona:
```bash
# Verificar que corre en puerto 8000
curl http://localhost:8000/health
# Debes ver: {"status":"healthy","service":"docai-api"}
```

### Frontend no funciona:
```bash
# Verificar que corre en puerto 3000
curl http://localhost:3000
# Debes ver HTML de la página
```

### Error de base de datos:
```bash
# La base de datos se crea automáticamente
# Archivo: /home/angel/DocAI/apps/api/docai.db
ls -la /home/angel/DocAI/apps/api/docai.db
```

### Error de permisos:
```bash
# Dar permisos si es necesario
chmod +x /home/angel/DocAI/apps/worker/worker.py
```

---

## 🎯 Estado Actual de Funcionalidades

| Función | Estado | Descripción |
|---------|--------|-------------|
| ✅ **Landing Page** | **Funcionando** | Estilo Anthropic completo |
| ✅ **Registro** | **Funcionando** | Crear cuentas nuevas |
| ✅ **Login** | **Funcionando** | Autenticación JWT |
| ✅ **Dashboard** | **Funcionando** | Panel completo del usuario |
| ✅ **Upload** | **Funcionando** | Subir archivos automático |
| ✅ **Procesamiento** | **Funcionando** | Worker básico funcional |
| ✅ **Chat** | **Funcionando** | Chat con documentos usando RAG |
| ✅ **RAG** | **Funcionando** | Respuestas con citas (mock embeddings) |
| ⏳ **Export** | **Pendiente** | Descargar resúmenes |

---

## 💬 **NUEVO: Chat con Documentos usando RAG**

### 🚀 ¡Sistema RAG Completamente Funcional!

El sistema de chat con documentos ya está operativo usando **mock embeddings** (no consume créditos de OpenAI).

### 📋 Cómo Usar el Chat:

1. **Sube un documento** al dashboard
2. **Espera a que se procese** (Status: Pending → Processing → Indexed)
3. **Haz clic en "Chat"** cuando esté listo
4. **¡Empieza a preguntar!**

### 🎯 Ejemplos de Consultas Efectivas:

**📄 Documento de Ejemplo: "Informe IA en Empresas"**
*(Ya está disponible en el sistema para probar)*

#### 🔍 **Consultas Generales:**
```
"¿De qué trata este documento?"
"Dame un resumen del contenido"
"¿Cuáles son los temas principales?"
```

#### 📊 **Consultas Específicas con Datos:**
```
"¿Cuánto cuesta implementar IA?"
"¿Qué porcentaje de reducción de costos menciona?"
"¿Cuánto tiempo toma ver retorno de inversión?"
```

#### 🏢 **Consultas sobre Casos de Éxito:**
```
"¿Qué hace Netflix con la IA?"
"Cuéntame sobre el caso de Tesla"
"¿Cómo usa Walmart la inteligencia artificial?"
```

#### ⚡ **Consultas sobre Beneficios:**
```
"¿Cuáles son los beneficios de la automatización?"
"¿Qué ventajas ofrece el análisis predictivo?"
"¿Cómo ayuda la IA con la personalización?"
```

#### 🚧 **Consultas sobre Desafíos:**
```
"¿Qué desafíos enfrentan las empresas al implementar IA?"
"¿Cuáles son los problemas de capacitación?"
"¿Qué consideraciones éticas menciona?"
```

#### 🔮 **Consultas sobre Tendencias:**
```
"¿Cuáles son las tendencias futuras de la IA?"
"¿Qué es la IA generativa?"
"¿Cómo se relaciona con edge computing?"
```

### ✨ **Características del Sistema RAG:**

1. **🎯 Búsqueda Inteligente:** Encuentra fragmentos relevantes automáticamente
2. **📖 Citas Automáticas:** Cada respuesta incluye citas con:
   - Número de página
   - Fragmento de texto exacto
   - Porcentaje de relevancia
3. **🔄 Procesamiento Real:** Extrae texto de PDF, DOCX, PPTX, TXT
4. **⚡ Respuestas Inmediatas:** Mock embeddings funcionan sin demora
5. **💾 Persistencia:** Las conversaciones se guardan automáticamente

### 🧪 **Probando el Sistema:**

#### **Método 1: Interfaz Web (Recomendado)**
1. Ve a http://localhost:3000/dashboard/chat
2. Selecciona el documento "Informe IA en Empresas"
3. Haz cualquiera de las preguntas de ejemplo
4. Observa las citas automáticas en la respuesta

#### **Método 2: API Directa**
```bash
# Obtener token de autenticación primero
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@docai.com", "password": "demo123"}' \
  | jq -r '.access_token')

# Hacer consulta al documento
curl -X POST http://localhost:8000/chat/documents/DOCUMENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "¿Cuáles son los beneficios de la IA?"}'
```

### 🎨 **Tipos de Documentos Soportados:**

| Tipo | Extensión | Estado | Características |
|------|-----------|--------|-----------------|
| **PDF** | `.pdf` | ✅ Completo | Texto + OCR para imágenes |
| **Word** | `.docx` | ✅ Completo | Extracción de párrafos |
| **PowerPoint** | `.pptx` | ✅ Completo | Texto de todas las diapositivas |
| **Texto** | `.txt` | ✅ Completo | Múltiples codificaciones |

### 🔄 **Flujo del Sistema RAG:**

1. **📄 Upload:** Usuario sube documento
2. **🔧 Procesamiento:** Worker extrae texto automáticamente
3. **✂️ Chunking:** Divide en fragmentos con overlap
4. **🧠 Embeddings:** Genera vectores (mock sin OpenAI)
5. **💾 Indexado:** Guarda en base de datos
6. **💬 Chat:** Usuario hace pregunta
7. **🔍 Búsqueda:** Encuentra fragmentos relevantes
8. **🤖 Respuesta:** Genera respuesta con citas
9. **📖 Resultado:** Muestra respuesta + referencias

### 🚀 **Próximamente (con OpenAI real):**
- Respuestas más precisas y contextuales
- Mejor comprensión semántica
- Respuestas multilingües mejoradas
- Generación de resúmenes automáticos

### 📝 **Notas Importantes:**
- **Mock embeddings:** Funcional sin consumir créditos OpenAI
- **Búsqueda efectiva:** Encuentra información relevante
- **Citas precisas:** Referencias exactas del documento
- **Performance:** Respuestas instantáneas en desarrollo

---

## ⚡ Comandos Útiles

```bash
# Ver logs de la API
tail -f /var/log/docai-api.log

# Limpiar base de datos (reiniciar)
rm /home/angel/DocAI/apps/api/docai.db

# Ver archivos subidos
ls -la /home/angel/DocAI/apps/api/uploads/

# Reiniciar servicios
pkill -f "python apps/api/main.py"
pkill -f "npm run dev"
```

---

## 📞 Endpoints API Útiles

```bash
# Registrar usuario
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@docai.com", "password": "test123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@docai.com", "password": "test123"}'

# Listar documentos (necesita token)
curl -X GET http://localhost:8000/documents/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 💡 Tips de Uso

1. **Siempre inicia la API primero** antes del frontend
2. **El worker es opcional** para pruebas de UI
3. **Los tokens expiran** - si tienes error 401, vuelve a hacer login
4. **La base de datos es SQLite** - se crea automáticamente
5. **Los archivos se guardan** en `/apps/api/uploads/`

---

**¡Guarda este archivo y tendrás siempre a mano cómo usar DocAI!** 🚀