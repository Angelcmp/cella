'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, AlertTriangle, Info, CheckCircle } from 'lucide-react'

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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          🚀 Introducción a Cella
        </h2>

        <p className="text-lg text-muted-foreground mb-6">
          Cella es una herramienta de análisis inteligente de documentos basada en IA. Sube un PDF,
          Word, PowerPoint o archivo de texto y conversa con su contenido de forma natural: obtén
          respuestas precisas con citas a la página exacta, resúmenes, mapas mentales y quiz generados
          automáticamente.
        </p>

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
              <li>• <strong>Base de Datos:</strong> SQLite</li>
              <li>• <strong>Embeddings:</strong> FastEmbed local (sin API key)</li>
              <li>• <strong>IA:</strong> DeepSeek + GLM (Zhipu)</li>
            </ul>
          </div>
        </div>

        <Callout type="info" title="Estado Actual">
          Cella es una aplicación funcional y lista para uso real. No requiere registro: entras
          directamente al espacio de trabajo, subes tus documentos y empiezas a analizarlos.
        </Callout>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          ⚡ Inicio Rápido
        </h2>

        <p className="text-muted-foreground mb-6">
          La forma más rápida de levantar Cella en tu máquina es usar el script de inicio, que levanta
          API, worker y frontend juntos:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">1. Configurar claves de IA</h3>
            <p className="text-muted-foreground mb-3">
              Copia <code className="bg-muted px-2 py-1 rounded">apps/api/.env.example</code> a{' '}
              <code className="bg-muted px-2 py-1 rounded">apps/api/.env</code> y completa las claves:
            </p>
            <CodeBlock filename="apps/api/.env">{`# DeepSeek (chat principal): https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=tu_clave_deepseek

# Zhipu / GLM (embeddings y chat): https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys
ZHIPU_API_KEY=tu_clave_zhipu

# Embeddings: 'local' usa FastEmbed sin API key
PROVIDER_EMBEDDINGS=local`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">2. Levantar todo</h3>
            <CodeBlock language="bash">{`# Desde la raíz del proyecto
./start.sh`}</CodeBlock>
            <p className="text-muted-foreground mt-3">
              O en modo ligero (solo Redis, sin Postgres/MinIO):{' '}
              <code className="bg-muted px-2 py-1 rounded">INFRA=light ./start.sh</code>
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">3. Verificar que funciona</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <a
                href="http://localhost:3000"
                target="_blank"
                className="flex items-center space-x-2 p-3 bg-primary/10 border border-primary rounded-lg text-primary hover:bg-primary/15 transition-colors"
              >
                <span>Frontend</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                className="flex items-center space-x-2 p-3 bg-primary/10 border border-primary rounded-lg text-primary hover:bg-primary/15 transition-colors"
              >
                <span>API Docs</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="http://localhost:8000/health"
                target="_blank"
                className="flex items-center space-x-2 p-3 bg-primary/10 border border-primary rounded-lg text-primary hover:bg-primary/15 transition-colors"
              >
                <span>API Health</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">4. Primer flujo de usuario</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Entra a <code className="bg-card px-2 py-1 rounded">http://localhost:3000</code></li>
                <li>Abre el espacio de trabajo <code className="bg-card px-2 py-1 rounded">/zen</code></li>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          📦 Instalación Completa
        </h2>

        <h3 className="text-xl font-semibold text-foreground mb-4">Requisitos del Sistema</h3>
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
              <h4 className="font-medium text-foreground mb-3">Herramientas Opcionales:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Docker</strong> y Docker Compose</li>
                <li>• <strong>Redis</strong> (cache; opcional en modo light)</li>
                <li>• <strong>Postman</strong> para testear API</li>
              </ul>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4">Proceso de Instalación Manual</h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">1. Clonar el Repositorio</h4>
            <CodeBlock>{`git clone <repository-url>
cd Cella`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">2. Configurar Backend (API)</h4>
            <CodeBlock>{`# Navegar al directorio de la API
cd apps/api

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o venv\\Scripts\\activate en Windows

# Instalar dependencias
pip install -r requirements.txt`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">3. Configurar Frontend</h4>
            <CodeBlock>{`# Navegar al directorio web
cd apps/web

# Instalar dependencias
npm install`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">4. Configurar Variables de Entorno</h4>
            <p className="text-muted-foreground mb-3">
              Copia <code className="bg-muted px-2 py-1 rounded">.env.example</code> a{' '}
              <code className="bg-muted px-2 py-1 rounded">.env</code> dentro de{' '}
              <code className="bg-muted px-2 py-1 rounded">apps/api/</code>:
            </p>
            <CodeBlock filename="apps/api/.env">{`# AI Providers
DEEPSEEK_API_KEY=tu_clave_deepseek
ZHIPU_API_KEY=tu_clave_zhipu

# Provider activo
PROVIDER_LLM=deepseek
PROVIDER_EMBEDDINGS=local

# Seguridad
SIGNING_SECRET=tu_secret_aleatorio_de_al_menos_32_caracteres
CSRF_SECRET_KEY=otro_secret_aleatorio

# Demo / Guest
DEMO_PUBLIC=true
DEMO_GUEST_ENABLED=true`}</CodeBlock>
          </div>

          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">5. Ejecutar</h4>
            <CodeBlock>{`# Terminal 1 - Backend API (puerto 8000)
cd apps/api
python main.py

# Terminal 2 - Worker de procesamiento
cd apps/worker
python worker.py

# Terminal 3 - Frontend (puerto 3000)
cd apps/web
npm run dev`}</CodeBlock>
            <Callout type="info">
              El worker es un bucle de sondeo (polling) que procesa documentos en background. No usa
              colas externas: basta con ejecutar <code>python worker.py</code>.
            </Callout>
          </div>
        </div>
      </section>

      {/* First Steps */}
      <section id="first-steps" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          👨‍💻 Primeros Pasos
        </h2>

        <p className="text-muted-foreground mb-6">
          Cella funciona sin registro. Al entrar al espacio de trabajo <code className="bg-muted px-2 py-1 rounded">/zen</code> se crea una
          sesión de invitado automáticamente.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Explorar el Espacio de Trabajo</h3>
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
            <h3 className="text-xl font-semibold text-foreground mb-4">Seleccionar un Modelo</h3>
            <p className="text-muted-foreground mb-4">
              Arriba del chat puedes elegir entre varios modelos de IA. El modelo seleccionado se guarda
              entre sesiones:
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• <strong>DeepSeek V4 Flash</strong> (predeterminado, gratuito)</li>
                <li>• <strong>GLM-4.5 Flash</strong> y <strong>GLM-4.7 Flash</strong> (gratuitos)</li>
                <li>• <strong>GLM-4.5 Air</strong> y <strong>GLM-4.7</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Uploading Documents */}
      <section id="uploading" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          📤 Subir Documentos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Formatos Soportados</h3>
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
            <h3 className="text-xl font-semibold text-foreground mb-4">Proceso de Upload</h3>
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
            <h3 className="text-xl font-semibold text-foreground mb-4">Estados del Documento</h3>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          💬 Chat con Documentos (RAG)
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Iniciar un Chat</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento con estado <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">"Listo"</span> en la barra lateral</li>
                <li>Escribe tu pregunta en el campo del chat</li>
                <li>Observa el razonamiento en tiempo real (Thinking Block)</li>
                <li>Recibe la respuesta con citas a la página exacta</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Razonamiento Visible</h3>
            <p className="text-muted-foreground mb-4">
              Antes de responder, el modelo muestra su razonamiento paso a paso en un bloque de "thinking"
              que se transmite en streaming por SSE. Esto permite entender cómo llega a la respuesta.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Interpretar Respuestas</h3>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          📖 Visualizador de Documentos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Características del Viewer</h3>
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
            <h3 className="text-xl font-semibold text-foreground mb-4">Navegación Rápida</h3>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          📋 Resúmenes Automáticos
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Acceso a Resúmenes</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>"Resumen"</strong> en el panel derecho</li>
                <li>El resumen se genera con IA en tiempo real</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Estructura del Resumen</h3>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          🧠 Mapas Mentales
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Generar un Mapa Mental</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>"Mapa"</strong> en el panel derecho</li>
                <li>La IA organiza el contenido en un grafo jerárquico</li>
                <li>Explora nodos arrastrando e interactuando con el grafo</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Navegación</h3>
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
        <h2 className="text-3xl font-bold text-foreground mb-6">
          📝 Quiz Generados
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Crear un Quiz</h3>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Selecciona un documento procesado</li>
                <li>Abre la pestaña <strong>"Quiz"</strong> en el panel derecho</li>
                <li>La IA genera preguntas de opción múltiple desde el contenido</li>
                <li>Responde y verifica tu comprensión al instante</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Retroalimentación</h3>
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

      {/* Technical Documentation */}
      <section id="technical" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          🔧 Documentación Técnica
        </h2>

        <div className="space-y-8">
          <div id="architecture">
            <h3 className="text-xl font-semibold text-foreground mb-4">Arquitectura del Sistema</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <CodeBlock language="text" filename="Estructura del Proyecto">{`Cella/
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── routers/           # Endpoints organizados
│   │   ├── database_simple.py # SQLite (base de datos activa)
│   │   ├── services/          # Lógica de negocio
│   │   └── main.py            # Aplicación principal
│   ├── web/                   # Frontend Next.js
│   │   ├── src/app/           # App Router (Next.js 15)
│   │   ├── src/components/    # Componentes React
│   │   └── src/lib/           # Utilidades y configuración
│   └── worker/                # Procesamiento background (polling)
│       ├── document_processor.py
│       └── worker.py          # Bucle de sondeo
├── scripts/                   # Scripts de desarrollo
├── start.sh                   # Orquestador local
└── docker-compose.yml`}</CodeBlock>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Stack Tecnológico</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">Backend (FastAPI)</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>FastAPI</strong> + Uvicorn</li>
                  <li>• <strong>SQLite</strong> vía SQLAlchemy (database_simple)</li>
                  <li>• <strong>FastEmbed</strong> para embeddings locales</li>
                  <li>• <strong>Redis</strong> opcional (cache ligera)</li>
                  <li>• <strong>Worker</strong> de polling para procesamiento</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-3">Frontend (Next.js)</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Next.js 15</strong> + App Router + TypeScript</li>
                  <li>• <strong>Tailwind CSS</strong> con variables CSS</li>
                  <li>• <strong>Zustand</strong> para estado global</li>
                  <li>• <strong>Cytoscape</strong> para mapas mentales</li>
                  <li>• <strong>Sonner</strong> para notificaciones toast</li>
                </ul>
              </div>
            </div>
          </div>

          <div id="rag-system">
            <h3 className="text-xl font-semibold text-foreground mb-4">Sistema RAG</h3>
            <div className="space-y-6">
              <div>
                <h4 id="document-processing" className="font-medium text-foreground mb-3">Flujo de Procesamiento</h4>
                <div className="bg-muted p-6 rounded-lg">
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li><strong>Upload de Documento:</strong> Validación y almacenamiento</li>
                    <li><strong>Procesamiento en Background:</strong> Extracción de texto y chunking</li>
                    <li><strong>Generación de Embeddings:</strong> Vectorización con FastEmbed</li>
                    <li><strong>Búsqueda Vectorial:</strong> Similitud coseno para encontrar contexto</li>
                    <li><strong>Generación de Respuesta:</strong> RAG con el modelo seleccionado</li>
                  </ol>
                </div>
              </div>

              <div id="database">
                <h4 className="font-medium text-foreground mb-3">Base de Datos</h4>
                <p className="text-muted-foreground mb-3">
                  La aplicación usa <strong>SQLite</strong> por defecto ({' '}
                  <code className="bg-muted px-2 py-1 rounded">apps/api/docai.db</code>). Los modelos
                  principales son usuarios, documentos, chunks y conversaciones.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Callout type="info" title="Arquitectura Modular">
          El sistema separa claramente frontend, backend y procesamiento de documentos para facilitar el
          mantenimiento y la escalabilidad.
        </Callout>
      </section>

      {/* API Reference */}
      <section id="api-reference" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          🔌 API Reference
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Información General</h3>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-3">Configuración Base</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• <strong>Base URL:</strong> <code className="bg-muted px-2 py-1 rounded">http://localhost:8000</code> (dev)</li>
                    <li>• <strong>Formato:</strong> JSON</li>
                    <li>• <strong>Autenticación:</strong> cookie de sesión / token Bearer</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-3">Documentación Interactiva</h4>
                  <div className="space-y-2">
                    <a 
                      href="http://localhost:8000/docs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-primary hover:text-primary/80"
                    >
                      <span>Swagger UI</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="authentication">
            <h3 className="text-xl font-semibold text-foreground mb-4">Autenticación</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">POST /auth/guest</h4>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Crear sesión de invitado (entrada sin registro)</span>
                  </div>
                  <div className="p-4">
                    <h5 className="font-medium text-muted-foreground mb-2">Response (200):</h5>
                    <CodeBlock language="json">{`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": { "id": 1, "email": null, "is_guest": true }
}`}</CodeBlock>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">GET /auth/me</h4>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Obtener el usuario de la sesión actual</span>
                  </div>
                  <div className="p-4">
                    <h5 className="font-medium text-muted-foreground mb-2">Response (200):</h5>
                    <CodeBlock language="json">{`{
  "id": 1,
  "email": null,
  "is_guest": true
}`}</CodeBlock>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="documents-api">
            <h3 className="text-xl font-semibold text-foreground mb-4">Gestión de Documentos</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">POST /documents/upload</h4>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Subir un nuevo documento</span>
                  </div>
                  <div className="p-4">
                    <div>
                      <h5 className="font-medium text-muted-foreground mb-2">Request Body (Form Data):</h5>
                      <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                        • <code>file</code>: Archivo (PDF/DOCX/PPTX/TXT)
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-muted-foreground mb-2 mt-4">Response (201):</h5>
                      <CodeBlock language="json">{`{
  "id": 123,
  "title": "Mi Documento.pdf",
  "file_size": 2048576,
  "status": "pending",
  "created_at": "2026-08-02T16:00:00Z"
}`}</CodeBlock>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">GET /documents/</h4>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Listar documentos del usuario</span>
                  </div>
                  <div className="p-4">
                    <h5 className="font-medium text-muted-foreground mb-2">Response (200):</h5>
                    <CodeBlock language="json">{`[
  {
    "id": 123,
    "title": "Mi Documento.pdf",
    "file_size": 2048576,
    "pages": 15,
    "status": "ready",
    "created_at": "2026-08-02T16:00:00Z"
  }
]`}</CodeBlock>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">GET /documents/{`{document_id}`}/content</h4>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Obtener el contenido paginado para el visualizador</span>
                  </div>
                  <div className="p-4">
                    <h5 className="font-medium text-muted-foreground mb-2">Response (200):</h5>
                    <CodeBlock language="json">{`{
  "document_id": 123,
  "total_pages": 15,
  "pages": [
    { "page_number": 1, "chunks": [], "full_text": "..." }
  ]
}`}</CodeBlock>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="chat-api">
            <h3 className="text-xl font-semibold text-foreground mb-4">Chat y RAG</h3>
            <div>
              <h4 className="font-medium text-foreground mb-2">POST /chat/documents/{`{document_id}`}</h4>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium">Hacer una pregunta sobre un documento (soporta SSE)</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="font-medium text-muted-foreground mb-2">Request Body:</h5>
                    <CodeBlock language="json">{`{
  "message": "¿De qué trata este documento?",
  "model": "deepseek-v4-flash",
  "stream": true
}`}</CodeBlock>
                  </div>
                  <div>
                    <h5 className="font-medium text-muted-foreground mb-2">Response (200, no-stream):</h5>
                    <CodeBlock language="json">{`{
  "response": "Este documento trata sobre la implementación de IA en empresas...",
  "citations": [
    { "page": 3, "snippet": "La IA puede reducir costos operativos hasta un 40%", "similarity": 0.95 }
  ]
}`}</CodeBlock>
                  </div>
                  <Callout type="info">
                    Con <code>stream: true</code> la respuesta llega como eventos SSE:{" "}
                    <code>thinking_start</code>, <code>thinking_delta</code>, <code>thinking_end</code>,{" "}
                    <code>text_delta</code> y <code>error</code>.
                  </Callout>
                </div>
              </div>
            </div>
          </div>

          <div id="error-codes">
            <h3 className="text-xl font-semibold text-foreground mb-4">Códigos de Error</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">Errores Comunes</h4>
                <div className="bg-card border border-border rounded-lg p-4">
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>400 Bad Request:</strong> Datos de entrada inválidos</li>
                    <li><strong>401 Unauthorized:</strong> Sesión inválida o expirada</li>
                    <li><strong>404 Not Found:</strong> Recurso no encontrado</li>
                    <li><strong>422 Unprocessable Entity:</strong> Error de validación de esquema</li>
                    <li><strong>500 Internal Server Error:</strong> Error interno del servidor</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-3">Ejemplo de Respuesta de Error</h4>
                <CodeBlock language="json">{`{
  "detail": "El documento especificado no existe o no tienes acceso"
}`}</CodeBlock>
              </div>
            </div>
          </div>
        </div>

        <Callout type="info" title="API Completa">
          Toda la documentación interactiva está disponible en{' '}
          <code className="bg-muted px-2 py-1 rounded">/docs</code> (Swagger UI) del backend.
        </Callout>
      </section>

      {/* Troubleshooting */}
      <section id="troubleshooting" className="mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-6">
          🔧 Solución de Problemas
        </h2>

        <div id="faq">
          <h3 className="text-xl font-semibold text-foreground mb-4">FAQ</h3>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Necesito una cuenta para usar Cella?</h4>
              <p className="text-muted-foreground text-sm">
                No. Cella funciona con sesiones de invitado: entras directo al espacio de trabajo y subes
                tus documentos sin registrarte.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Qué modelos de IA se usan?</h4>
              <p className="text-muted-foreground text-sm">
                DeepSeek V4 Flash (predeterminado) y varios modelos GLM de Zhipu. Los embeddings se
                generan localmente con FastEmbed, sin necesidad de otra API key.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">¿Dónde se guardan mis conversaciones?</h4>
              <p className="text-muted-foreground text-sm">
                Las conversaciones se guardan en el navegador (localStorage) y se muestran en el historial
                de la barra lateral.
              </p>
            </div>
          </div>
        </div>

        <div id="common-issues" className="mt-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Problemas Comunes</h3>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">El documento queda en "Pendiente"</h4>
              <p className="text-muted-foreground text-sm">
                Asegúrate de que el worker esté corriendo: <code className="bg-muted px-2 py-1 rounded">cd apps/worker && python worker.py</code>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">El chat devuelve errores de conexión</h4>
              <p className="text-muted-foreground text-sm">
                Verifica que la API esté en el puerto 8000 y que la variable{' '}
                <code className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_API_URL</code> del frontend apunte
                a ella.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Las respuestas fallan por API key</h4>
              <p className="text-muted-foreground text-sm">
                Revisa que <code className="bg-muted px-2 py-1 rounded">DEEPSEEK_API_KEY</code> y{' '}
                <code className="bg-muted px-2 py-1 rounded">ZHIPU_API_KEY</code> estén definidas en{' '}
                <code className="bg-muted px-2 py-1 rounded">apps/api/.env</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Status Summary */}
      <div className="mt-16 p-6 bg-muted rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          📚 Estado de la Documentación
        </h3>
        <p className="text-muted-foreground mb-4">
          Documentación actualizada con las funcionalidades reales de Cella.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Introducción</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Inicio Rápido</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Instalación</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Primeros Pasos</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Upload de Documentos</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Chat RAG</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Visualizador</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Resúmenes</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Mapas Mentales</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Quiz</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ Documentación Técnica</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">✅ API Reference</span>
        </div>
      </div>
    </div>
  )
}
