import axios from "axios";

/**
 * Upload de arquivo para URL pública
 * Para Phase 4: usar Firebase Storage ou CDN
 * Por enquanto: simples proxy que retorna URL do cliente
 */
export async function uploadMedia(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  // TODO: Implementar upload real para Firebase Storage
  // Por enquanto, retorna URL placeholder
  // Em produção: usar @google-cloud/storage

  const url = `https://storage.googleapis.com/zapflow/${Date.now()}-${fileName}`;
  console.log(`[Storage] Placeholder URL: ${url}`);

  return url;
}

/**
 * Validar se URL é acessível
 */
export async function validateMediaUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error(`[Storage] Invalid URL ${url}:`, error);
    return false;
  }
}

/**
 * Tipos de mídia suportados
 */
export const SUPPORTED_MEDIA_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav"],
  document: ["application/pdf"],
  video: ["video/mp4", "video/3gpp"],
};

export function validateMediaType(
  mimeType: string,
  type: "image" | "audio" | "document" | "video"
): boolean {
  return SUPPORTED_MEDIA_TYPES[type].includes(mimeType);
}
