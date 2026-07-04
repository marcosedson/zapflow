import axios from "axios";

export interface SendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  messageId?: string;
}

/**
 * Envia mensagem de texto via Evolution API
 * POST {apiUrl}/message/sendText/{instanceName}
 * Headers: apikey, Authorization (Bearer opcional)
 * Body: { number, text, delay }
 */
export async function sendWhatsAppText(
  apiUrl: string,
  instanceName: string,
  apiKey: string,
  phone: string,
  text: string,
  delay: number = 1500
): Promise<SendResult> {
  try {
    const url = `${apiUrl}/message/sendText/${instanceName}`;

    const response = await axios.post(
      url,
      {
        number: phone,
        text: text,
        delay: delay,
      },
      {
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      statusCode: response.status,
      messageId: response.data?.key?.id,
    };
  } catch (error: any) {
    const statusCode = error.response?.status;
    const errorMsg = error.response?.data?.message || error.message;

    return {
      success: false,
      statusCode,
      error: `[${statusCode || "UNKNOWN"}] ${errorMsg}`,
    };
  }
}

/**
 * Envia mensagem com mídia (imagem, áudio, documento, vídeo)
 * Para Phase 4+
 */
export async function sendWhatsAppMedia(
  apiUrl: string,
  instanceName: string,
  apiKey: string,
  phone: string,
  caption: string,
  mediaUrl: string,
  mediaType: "image" | "audio" | "document" | "video",
  delay: number = 1500
): Promise<SendResult> {
  try {
    const url = `${apiUrl}/message/sendMedia/${instanceName}`;

    const response = await axios.post(
      url,
      {
        number: phone,
        caption: caption,
        media: {
          url: mediaUrl,
          type: mediaType,
        },
        delay: delay,
      },
      {
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return {
      success: true,
      statusCode: response.status,
      messageId: response.data?.key?.id,
    };
  } catch (error: any) {
    const statusCode = error.response?.status;
    const errorMsg = error.response?.data?.message || error.message;

    return {
      success: false,
      statusCode,
      error: `[${statusCode || "UNKNOWN"}] ${errorMsg}`,
    };
  }
}
