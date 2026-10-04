const MB = 1024 * 1024;

// Límites de subida por tipo de archivo (bytes).
export const MAX_UPLOAD_BYTES: Record<string, number> = {
  "application/pdf": 200 * MB,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 200 * MB,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 200 * MB,
  "application/msword": 200 * MB,
  "text/plain": 200 * MB,
  // Imágenes: límite definido; ingesta (OCR) pendiente.
  "image/png": 25 * MB,
  "image/jpeg": 25 * MB,
  "image/gif": 25 * MB,
  "image/webp": 25 * MB,
};

// Tipos habilitados para subida (mismo set que el backend).
export const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "text/plain",
];

export const MAX_PDF_PAGES = 5000;

// Máximo de archivos por proyecto.
export const MAX_FILES_PER_PROJECT = 10;

export function maxBytesFor(type: string): number {
  return MAX_UPLOAD_BYTES[type] ?? 200 * MB;
}

export function formatLimit(type: string): string {
  const mb = Math.round(maxBytesFor(type) / MB);
  return `${mb} MB`;
}
