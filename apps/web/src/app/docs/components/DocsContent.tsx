'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react'

interface CodeBlockProps {
  children: string
  language?: string
  filename?: string
}

function CodeBlock({ children, language = 'bash', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden my-6 border border-border">
      {filename && (
        <div className="px-4 py-2 bg-muted text-muted-foreground text-sm font-mono border-b border-border">
          {filename}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-foreground text-sm">
          <code className={`language-${language}`}>{children}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 bg-muted hover:bg-muted/80 rounded text-foreground transition-colors border border-border"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

interface CalloutProps {
  type: 'info' | 'warning' | 'success' | 'danger'
  title?: string
  children: React.ReactNode
}

function Callout({ type, title, children }: CalloutProps) {
  const configs = {
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary',
      textColor: 'text-primary',
      iconColor: 'text-primary'
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent', 
      textColor: 'text-accent',
      iconColor: 'text-accent'
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary',
      textColor: 'text-primary', 
      iconColor: 'text-primary'
    },
    danger: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive',
      textColor: 'text-destructive',
      iconColor: 'text-destructive'
    }
  }

  const config = configs[type]

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 my-6`}>
      <div className="flex items-start space-x-3">
        <div className={config.iconColor}>
          {config.icon}
        </div>
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${config.textColor} mb-2`}>
              {title}
            </h4>
          )}
          <div className={config.textColor}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DocsContent() {
  return (
    <div className="prose max-w-none text-foreground">
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          🚀 Introducción a Cella
        </h2>

        <p className="text-base text-muted-foreground mb-5">
          Cella es un asistente de estudio y análisis de documentos, estilo NotebookLM, que funciona{' '}
          <strong>100% en tu máquina</strong>. Sube un PDF, Word, PowerPoint o texto y conversa con su
          contenido de forma natural: respuestas con citas a la página exacta, resúmenes, mapas
          mentales, quiz y más.
        </p>

        <Callout type="success" title="100% Local">
          Cella no requiere registro, no sube tus documentos a ninguna nube y no tiene planes de pago.
          Tú eliges qué modelo de IA usar: modelos locales con Ollama o tu propia API key
          (OpenAI, Claude, DeepSeek, Gemini, etc.).
        </Callout>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
            <h3 className="font-semibold text-foreground mb-3">✨ Características Principales</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Chat inteligente con documentos (RAG)</li>
              <li>• Razonamiento visible con Thinking Blocks</li>
              <li>• Resúmenes automáticos con IA</li>
              <li>• Mapas mentales interactivos</li>
              <li>• Quiz generados desde el contenido</li>
              <li>• Citas automáticas con número de página</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
            <h3 className="font-semibold text-foreground mb-3">🛠️ Stack Tecnológico</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Frontend:</strong> Next.js 15 + TypeScript</li>
              <li>• <strong>Backend:</strong> FastAPI + Python</li>
              <li>• <strong>Base de Datos:</strong> SQLite (local)</li>
              <li>• <strong>Embeddings:</strong> FastEmbed local (sin API key)</li>
              <li>• <strong>IA:</strong> tu modelo — Ollama local o API keys propias</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          ⚡ Inicio Rápido
        </h2>

        <p className="text-muted-foreground mb-6">
          La forma más rápida de levantar Cella es clonar el repositorio y usar el script de inicio,
          que levanta API, worker y frontend juntos:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">1. Clonar e instalar</h3>
            <CodeBlock>{`git clone <repository-url>
cd Cella

# Backend (Python 3.11+)
cd apps/api
python3 -m venv .venv311
source .venv311/bin/activate
pip install -r requirements.txt

# Frontend
cd ../web
npm install`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">2. Levantar todo</h3>
            <CodeBlock language="bash">{`# Desde la raíz del proyecto
./start.sh`}</CodeBlock>
            <p className="text-muted-foreground mt-3">
              Sin Redis en tu sistema:{' '}
              <code className="bg-muted px-2 py-1 rounded">SKIP_REDIS=1 ./start.sh</code> (usa cache en memoria).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">3. Configurar modelos de IA</h3>
            <p className="text-muted-foreground mb-3">
              Sin un modelo configurado no puedes chatear. Abre el espacio de trabajo, pulsa el botón de
              ajustes y elige <strong>&quot;Modelos e IA&quot;</strong> para conectar Ollama local o añadir una API key:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Entra a <code className="bg-card px-2 py-1 rounded">http://localhost:3000/zen</code></li>
                <li>Pulsa el botón de ajustes y abre <strong>&quot;Modelos e IA&quot;</strong></li>
                <li>Añade un proveedor (por ejemplo Ollama o DeepSeek) con su API key</li>
                <li>Pulsa <strong>&quot;Sync&quot;</strong> para cargar los modelos disponibles</li>
                <li>Selecciona un modelo por defecto</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">4. Primer flujo de usuario</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Sube un documento desde la barra lateral</li>
                <li>Espera a que termine el procesamiento</li>
                <li>¡Pregunta lo que quieras sobre tu documento!</li>
              </ol>
            </div>
          </div>
        </div>

        <Callout type="success" title="¡Listo!">
          Con estos pasos Cella estará funcionando con chat inteligente, resúmenes, mapas mentales y quiz.
        </Callout>
      </section>

      {/* Installation */}
      <section id="installation" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          📦 Instalación Completa
        </h2>

        <h3 className="text-lg font-semibold text-foreground mb-3">Requisitos del Sistema</h3>
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Software Requerido:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Node.js</strong> 18.x o superior</li>
                <li>• <strong>Python</strong> 3.11 o superior</li>
                <li>• <strong>Git</strong> para clonar el repositorio</li>
                <li>• <strong>4GB RAM</strong> mínimo recomendado</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Opcionales:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Ollama</strong> para usar modelos locales sin API key</li>
                <li>• <strong>Redis</strong> (cache; se omite con <code>SKIP_REDIS=1</code>)</li>
                <li>• <strong>Docker</strong> para levantar Redis automáticamente</li>
              </ul>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-3">Proceso de Instalación Manual</h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-base font-medium text-foreground mb-2.5">1. Clonar el Repositorio</h4>
            <CodeBlock>{`git clone <repository-url>
cd Cella`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-base font-medium text-foreground mb-2.5">2. Configurar Backend (API)</h4>
            <CodeBlock>{`cd apps/api

# Crear entorno virtual
python3 -m venv .venv311
source .venv311/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-base font-medium text-foreground mb-2.5">3. Configurar Frontend</h4>
            <CodeBlock>{`cd ../web
npm install`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-base font-medium text-foreground mb-2.5">4. Variables de Entorno (opcional)</h4>
            <p className="text-muted-foreground mb-3">
              Cella funciona sin tocar el <code className="bg-muted px-2 py-1 rounded">.env</code>: puedes
              configurar tus proveedores de IA desde la interfaz. Si prefieres usar API keys desde el
              entorno, copia <code className="bg-muted px-2 py-1 rounded">apps/api/.env.example</code> a{' '}
              <code className="bg-muted px-2 py-1 rounded">apps/api/.env</code>:
            </p>
            <CodeBlock filename="apps/api/.env">{`# IA (opcional, también configurable desde la UI)
DEEPSEEK_API_KEY=tu_clave_deepseek
OPENAI_API_KEY=tu_clave_openai
ANTHROPIC_API_KEY=tu_clave_anthropic

# Embeddings: 'local' usa FastEmbed sin API key
PROVIDER_EMBEDDINGS=local

# Seguridad
SIGNING_SECRET=tu_secret_aleatorio_de_al_menos_32_caracteres
CSRF_SECRET_KEY=otro_secret_aleatorio
CSRF_ENABLED=false`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-base font-medium text-foreground mb-2.5">5. Ejecutar</h4>
            <CodeBlock>{`# Todo junto (API :8000 + Worker + Frontend :3000)
./start.sh`}</CodeBlock>
            <p className="text-muted-foreground mt-3">O en tres terminales separadas:</p>
            <CodeBlock>{`# Terminal 1 - Backend API (puerto 8000)
cd apps/api && source .venv311/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 - Worker de procesamiento
cd apps/worker && source ../api/.venv311/bin/activate && python worker.py

# Terminal 3 - Frontend (puerto 3000)
cd apps/web && npm run dev`}</CodeBlock>
            <Callout type="info">
              El worker es un bucle de sondeo (polling) que procesa documentos en background. No usa
              colas externas: basta con ejecutar <code>python worker.py</code>.
            </Callout>
          </div>
        </div>
      </section>

      {/* First Steps */}
      <section id="first-steps" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          👨‍💻 Primeros Pasos
        </h2>

        <p className="text-muted-foreground mb-6">
          Cella funciona sin registro. El espacio de trabajo vive en{' '}
          <code className="bg-muted px-2 py-1 rounded">/zen</code>, donde se crea tu usuario local
          automáticamente.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Explorar el Espacio de Trabajo</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">📁 Barra Lateral</h4>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>• Proyectos y documentos subidos</li>
                  <li>• Historial de conversaciones</li>
                  <li>• Botón para subir documentos</li>
                  <li>• Ajustes de tema (claro/oscuro)</li>
                </ul>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">🎛️ Panel Derecho</h4>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>• Pestaña Documento: visualizador</li>
                  <li>• Pestaña Resumen: síntesis con IA</li>
                  <li>• Pestaña Mapa: mapa mental interactivo</li>
                  <li>• Pestaña Quiz: preguntas desde el contenido</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Seleccionar un Modelo</h3>
            <p className="text-muted-foreground mb-4">
              Arriba del chat puedes elegir entre los modelos disponibles. El selector muestra los
              modelos de tus proveedores configurados:
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Si no aparece ningún modelo, verás un aviso con un acceso a <strong>&quot;Ajustes de modelos&quot;</strong></li>
                <li>• Los modelos vienen de tus proveedores (Ollama local o API keys)</li>
                <li>• El modelo seleccionado se guarda entre sesiones</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Models & AI */}
      <section id="models-overview" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          🤖 Modelos e IA
        </h2>

        <p className="text-muted-foreground mb-6">
          Cella no incluye un modelo por defecto: <strong>tú decides</strong>. Puedes usar modelos
          locales con Ollama (gratis y sin conexión) o conectar tu propia API key de cualquier proveedor.
          Todo se configura desde la interfaz, en <strong>ajustes → &quot;Modelos e IA&quot;</strong>.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Dos maneras de usar IA</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h4 className="font-medium text-foreground mb-3">🦙 Ollama (local, sin API key)</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• Todo queda en tu máquina, sin coste</li>
                  <li>• Requiere instalar Ollama y descargar modelos</li>
                  <li>• Ideal para privacidad total y uso sin internet</li>
                </ul>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h4 className="font-medium text-foreground mb-3">🔑 API keys propias</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• OpenAI, Claude, DeepSeek, Gemini, GLM, Qwen, Kimi, MiniMax</li>
                  <li>• Las keys se guardan cifradas en la base de datos local</li>
                  <li>• Solo tu máquina las usa</li>
                </ul>
              </div>
            </div>
          </div>

          <div id="ollama">
            <h3 className="text-lg font-semibold text-foreground mb-3">Configurar Ollama</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Instala Ollama desde <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ollama.com</a></li>
                <li>Descarga un modelo, por ejemplo: <code className="bg-card px-2 py-1 rounded">ollama pull qwen2.5</code></li>
                <li>Deja Ollama corriendo (normalmente ya lo hace en <code className="bg-card px-2 py-1 rounded">http://localhost:11434</code>)</li>
                <li>En Cella: ajustes → <strong>&quot;Modelos e IA&quot;</strong> → añade un proveedor de tipo <strong>Ollama</strong></li>
                <li>Pulsa <strong>&quot;Sync&quot;</strong> y Cella descubrirá los modelos que tienes descargados</li>
              </ol>
            </div>
            <Callout type="info">
              Ollama expone una API compatible con OpenAI en <code>http://localhost:11434/v1</code>.
              Si Ollama corre en otra máquina o puerto, indica la URL en el campo <strong>Base URL</strong>.
            </Callout>
          </div>

          <div id="api-providers">
            <h3 className="text-lg font-semibold text-foreground mb-3">Configurar un proveedor de API</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Abre ajustes → <strong>&quot;Modelos e IA&quot;</strong> → <strong>&quot;Añadir proveedor&quot;</strong></li>
                <li>Elige el tipo (OpenAI, DeepSeek, Claude, Gemini, etc.)</li>
                <li>Pega tu API key (los proveedores que no son Ollama la piden)</li>
                <li>Si quieres un endpoint alternativo, rellena la <strong>Base URL</strong></li>
                <li>Guarda y pulsa <strong>&quot;Probar&quot;</strong> para verificar la conexión</li>
                <li>Pulsa <strong>&quot;Sync&quot;</strong> para cargar los modelos disponibles y marca uno como <strong>Default</strong></li>
              </ol>
            </div>
          </div>

          <div id="provider-settings">
            <h3 className="text-lg font-semibold text-foreground mb-3">Gestionar proveedores</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Probar:</strong> envía una petición de prueba y te dice si la key o la URL funcionan</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Sync:</strong> consulta el catálogo real de modelos del proveedor</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Default:</strong> el modelo pre-seleccionado en el chat</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Eliminar:</strong> borra el proveedor y sus modelos asociados</span>
                </li>
              </ul>
            </div>
            <Callout type="info">
              Las API keys se cifran (Fernet) antes de guardarse en SQLite usando tu{' '}
              <code>LOCAL_ENCRYPTION_KEY</code> o <code>SIGNING_SECRET</code>. Nadie más que tu máquina
              puede leerlas.
            </Callout>
          </div>
        </div>
      </section>

      {/* Uploading Documents */}
      <section id="uploading" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          📤 Subir Documentos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Formatos Soportados</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-destructive rounded-full"></span>
                    <span><strong>PDF</strong> (.pdf)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                    <span><strong>Word</strong> (.docx)</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-accent rounded-full"></span>
                    <span><strong>PowerPoint</strong> (.pptx)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-muted-foreground rounded-full"></span>
                    <span><strong>Texto</strong> (.txt)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Proceso de Upload</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Clic en <strong>Subir</strong> en la barra lateral</li>
                <li><strong>Arrastra y suelta</strong> archivos o <strong>clic para seleccionar</strong></li>
                <li><strong>Validación automática</strong> de formato y tamaño</li>
                <li><strong>Procesamiento automático</strong> en background por el worker</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Estados del Documento</h3>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="grid divide-y divide-border">
                <div className="p-4 flex items-center space-x-4">
                  <span className="w-4 h-4 bg-accent rounded-full"></span>
                  <span className="font-medium">Pendiente</span>
                  <span className="text-muted-foreground">Subido, esperando procesamiento</span>
                </div>
                <div className="p-4 flex items-center space-x-4">
                  <span className="w-4 h-4 bg-primary rounded-full"></span>
                  <span className="font-medium">Procesando</span>
                  <span className="text-muted-foreground">Extrayendo texto y generando embeddings</span>
                </div>
                <div className="p-4 flex items-center space-x-4">
                  <span className="w-4 h-4 bg-primary rounded-full"></span>
                  <span className="font-medium">Listo</span>
                  <span className="text-muted-foreground">Procesado, disponible para chat</span>
                </div>
                <div className="p-4 flex items-center space-x-4">
                  <span className="w-4 h-4 bg-destructive rounded-full"></span>
                  <span className="font-medium">Error</span>
                  <span className="text-muted-foreground">Error en procesamiento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Callout type="info" title="Consejo">
          Los documentos con más texto y estructura clara se procesan mejor. Los PDFs escaneados usan OCR
          y pueden tardar más.
        </Callout>
      </section>

      {/* Chat RAG */}
      <section id="chat-rag" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          💬 Chat con Documentos (RAG)
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Iniciar un Chat</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento con estado <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">&quot;Listo&quot;</span> en la barra lateral</li>
                <li>Elige un modelo en el selector del chat</li>
                <li>Escribe tu pregunta en el campo del chat</li>
                <li>Observa el razonamiento en tiempo real (Thinking Block)</li>
                <li>Recibe la respuesta con citas a la página exacta</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Razonamiento Visible</h3>
            <p className="text-muted-foreground mb-4">
              Antes de responder, el modelo muestra su razonamiento paso a paso en un bloque de &quot;thinking&quot;
              que se transmite en streaming por SSE. Esto permite entender cómo llega a la respuesta.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Interpretar Respuestas</h3>
            <p className="text-muted-foreground mb-4">Las respuestas del chat incluyen:</p>
            <div className="bg-card border border-border rounded-lg p-6">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2"></span>
                  <span><strong>Respuesta contextual</strong> basada únicamente en el documento</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2"></span>
                  <span><strong>Citas automáticas</strong> con número de página y fragmento exacto</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2"></span>
                  <span><strong>Porcentaje de relevancia</strong> para cada cita</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Callout type="success" title="RAG (Retrieval Augmented Generation)">
          El sistema RAG busca los fragmentos más relevantes de tu documento y genera respuestas basadas
          únicamente en ese contenido, garantizando precisión y citas verificables.
        </Callout>
      </section>

      {/* Document Viewer */}
      <section id="document-viewer" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          📖 Visualizador de Documentos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Características del Viewer</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span><strong>Visualización tipo papel</strong> con dimensiones estándar</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span><strong>Zoom dinámico</strong> ajustable</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span><strong>Navegación por páginas</strong> con flechas</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span><strong>Búsqueda de texto</strong> con resaltado</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Navegación Rápida</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ul className="space-y-3 text-muted-foreground">
                <li>• Al hacer clic en una cita del chat, el viewer <strong>salta a la página</strong> del fragmento</li>
                <li>• <strong>Flechas laterales</strong> para página anterior/siguiente</li>
                <li>• Búsqueda en tiempo real con highlighting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Summaries */}
      <section id="summaries" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          📋 Resúmenes Automáticos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Acceso a Resúmenes</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>&quot;Resumen&quot;</strong> en el panel derecho</li>
                <li>El resumen se genera con IA en tiempo real</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Estructura del Resumen</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span><strong>Executive Summary</strong> - Resumen ejecutivo breve</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span><strong>Puntos Clave</strong> - Ideas principales organizadas</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span><strong>Temas Principales</strong> - Categorías identificadas</span>
                  </li>
                </ul>
              </div>
              <div className="bg-primary/10 border border-primary rounded-lg p-6">
                <h4 className="font-medium text-foreground mb-3">Características:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Generado automáticamente con IA</li>
                  <li>• Extrae puntos clave del contenido</li>
                  <li>• Categoriza temas principales</li>
                  <li>• Optimizado para lectura rápida</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mindmap */}
      <section id="mindmap" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          🧠 Mapas Mentales
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Generar un Mapa Mental</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>&quot;Mapa&quot;</strong> en el panel derecho</li>
                <li>La IA organiza el contenido en un grafo jerárquico</li>
                <li>Explora nodos arrastrando e interactuando con el grafo</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Navegación</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <ul className="space-y-3 text-muted-foreground">
                <li>• <strong>Arrastra</strong> el fondo para mover el lienzo</li>
                <li>• <strong>Haz clic</strong> en un nodo para ver su contenido</li>
                <li>• Los nodos centrales muestran temas, los secundarios, detalles</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quiz */}
      <section id="quiz" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          📝 Quiz Generados
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Crear un Quiz</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>&quot;Quiz&quot;</strong> en el panel derecho</li>
                <li>La IA genera preguntas de opción múltiple desde el contenido</li>
                <li>Responde y verifica tu comprensión al instante</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Retroalimentación</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <ul className="space-y-3 text-muted-foreground">
                <li>• Respuestas <strong>correctas/incorrectas</strong> con feedback inmediato</li>
                <li>• Explicación de cada respuesta basada en el documento</li>
                <li>• Ideal para repasar y fijar conceptos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section id="troubleshooting" className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-5">
          🔧 Solución de Problemas
        </h2>

        <div id="faq">
          <h3 className="text-lg font-semibold text-foreground mb-3">FAQ</h3>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Necesito una cuenta para usar Cella?</h4>
              <p className="text-muted-foreground text-sm">
                No. Cella es una app local de un solo usuario: tu usuario local se crea automáticamente.
                No hay registro, ni login, ni pagos.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Mis documentos se suben a la nube?</h4>
              <p className="text-muted-foreground text-sm">
                No. Todo se procesa y almacena en tu máquina (SQLite + FastEmbed local). La única
                excepción es si usas un proveedor de IA con API key, en cuyo caso los fragmentos
                relevantes se envían a ese proveedor para generar la respuesta.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Qué modelos de IA puedo usar?</h4>
              <p className="text-muted-foreground text-sm">
                Los que tú configures: modelos locales con Ollama, o API keys de OpenAI, Claude, DeepSeek,
                GLM (Zhipu), Gemini, Qwen, Kimi y MiniMax. Los embeddings se generan localmente con
                FastEmbed, sin necesidad de otra API key.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Dónde se guardan mis conversaciones?</h4>
              <p className="text-muted-foreground text-sm">
                En la base de datos local (SQLite) y se muestran en el historial de la barra lateral.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Por qué la primera carga es lenta?</h4>
              <p className="text-muted-foreground text-sm">
                Al primer arranque, el modelo de embeddings local (FastEmbed) se descarga de HuggingFace
                (~10-15 segundos). Es un proceso de una sola vez.
              </p>
            </div>
          </div>
        </div>

        <div id="common-issues" className="mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Problemas Comunes</h3>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">El documento queda en &quot;Pendiente&quot;</h4>
              <p className="text-muted-foreground text-sm">
                Asegúrate de que el worker esté corriendo. Con{' '}
                <code className="bg-muted px-2 py-1 rounded">./start.sh</code> ya se levanta solo; a mano,
                ejecuta <code className="bg-muted px-2 py-1 rounded">cd apps/worker && python worker.py</code>.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">No aparece ningún modelo en el chat</h4>
              <p className="text-muted-foreground text-sm">
                Necesitas al menos un proveedor configurado. Abre ajustes → &quot;Modelos e IA&quot;, añade un
                proveedor (Ollama o API key) y pulsa &quot;Sync&quot;. Si usas Ollama, verifica que esté corriendo
                y que tengas al menos un modelo descargado.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">El chat devuelve errores de conexión</h4>
              <p className="text-muted-foreground text-sm">
                Verifica que la API esté en el puerto 8000 y que el proveedor esté alcanzable. Usa el
                botón &quot;Probar&quot; del proveedor para aislar el problema.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Las respuestas fallan por API key</h4>
              <p className="text-muted-foreground text-sm">
                Revisa que la key esté bien escrita en ajustes → &quot;Modelos e IA&quot; y que el proveedor pase
                la prueba de conexión. Las keys se guardan cifradas localmente.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Ollama no conecta</h4>
              <p className="text-muted-foreground text-sm">
                Confirma que <code className="bg-muted px-2 py-1 rounded">ollama serve</code> esté
                corriendo y comprueba{' '}
                <code className="bg-muted px-2 py-1 rounded">curl http://localhost:11434/v1/models</code>.
                Si el puerto cambió, indica la Base URL correcta en la configuración del proveedor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Status Summary */}
      <div className="mt-16 p-6 bg-muted rounded-lg border border-border">
        <h3 className="text-base font-semibold text-foreground mb-2">
          📚 Documentación de Cella Local
        </h3>
        <p className="text-muted-foreground mb-4">
          Guía completa para instalar y usar Cella como aplicación local.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Introducción</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Inicio Rápido</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Instalación</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Modelos e IA</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Upload de Documentos</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Chat RAG</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Visualizador</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Resúmenes</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Mapas Mentales</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Quiz</span>
        </div>
      </div>
    </div>
  )
}
