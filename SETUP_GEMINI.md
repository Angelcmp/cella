# 🔑 Configuración de Gemini API (GRATIS)

## ✅ Integración Completada

El sistema DocAI ahora soporta **Google Gemini API** como alternativa gratuita a OpenAI.

### 🆓 **Beneficios de Gemini API:**
- **Completamente gratis** hasta límites generosos
- **15 requests/min** para generación de texto  
- **1500 requests/day** total
- **100 requests/min** para embeddings
- **Sin tarjeta de crédito** requerida

## 🚀 **Cómo obtener tu API Key gratuita:**

### Paso 1: Obtener API Key
1. Ve a **https://aistudio.google.com/app/apikey**
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Create API key"**
4. Copia la API key generada

### Paso 2: Configurar en DocAI
1. Crea un archivo `.env` en `/home/angel/DocAI/apps/api/`:
```bash
# Google Gemini API Key (GRATIS)
GEMINI_API_KEY=tu_api_key_aqui

# Database Configuration
DATABASE_URL=sqlite:///./docai.db
```

### Paso 3: Reiniciar servicios
```bash
# Reiniciar API
cd /home/angel/DocAI/apps/api
python main.py

# Reiniciar Worker (para procesamiento de documentos)
cd /home/angel/DocAI/apps/worker  
python worker.py
```

## 🎯 **Estado Actual:**

### ✅ **Implementado:**
- ✅ Soporte completo para Gemini embeddings en RAG system
- ✅ Soporte completo para Gemini chat en generación de respuestas  
- ✅ Worker actualizado para usar Gemini embeddings
- ✅ Fallback automático a mock si no hay API key
- ✅ Prioridad: Gemini > OpenAI > Mock

### 🔧 **Funcionamiento:**
1. **Sin API key**: Usa respuestas simuladas (actual)
2. **Con Gemini key**: Usa Gemini para todo (recomendado)
3. **Con OpenAI key**: Usa OpenAI como antes
4. **Con ambas**: Prioriza Gemini por ser gratis

## 🧪 **Para probar:**

1. **Configura la API key de Gemini** (paso anterior)
2. **Sube un documento** en http://localhost:3000/dashboard
3. **Haz preguntas** en el chat - ¡ahora será Gemini real!

## 📊 **Modelos utilizados:**
- **Chat**: `gemini-pro` (muy capaz, comparable a GPT-3.5)
- **Embeddings**: `text-embedding-004` (768 dimensiones)

---

**🎉 ¡Listo para usar Gemini completamente gratis!**