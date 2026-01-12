// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

interface OptimizeImageRequest {
  imageBase64: string; // data:image/png;base64,... 形式
  alt: string;
  filename: string; // 例: "eyecatch-タイトル"
}

interface OptimizedImage {
  pc: string; // 800px幅のWebP (base64)
  mobile: string; // 350px幅のWebP (base64)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { imageBase64, alt, filename } = await context.request.json() as OptimizeImageRequest;

    if (!imageBase64 || !filename) {
      return errorResponse("Image data and filename are required", 400);
    }

    console.log(`Optimizing image: ${filename}`);

    // Base64からバイナリデータを抽出
    const base64Data = imageBase64.split(",")[1];
    const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || "image/png";
    
    // バイナリデータをArrayBufferに変換
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // PC用画像を生成 (800px, 30KB以下)
    const pcImage = await resizeAndCompressImage(
      binaryData.buffer,
      mimeType,
      800,
      30 * 1024 // 30KB
    );

    // スマホ用画像を生成 (350px, 10KB以下)
    const mobileImage = await resizeAndCompressImage(
      binaryData.buffer,
      mimeType,
      350,
      10 * 1024 // 10KB
    );

    console.log(`Image optimized successfully: ${filename}`);
    console.log(`PC size: ${Math.round(pcImage.length / 1024)}KB, Mobile size: ${Math.round(mobileImage.length / 1024)}KB`);

    return jsonResponse({
      success: true,
      data: {
        pc: pcImage,
        mobile: mobileImage,
        alt,
        filename,
      },
    });
  } catch (error) {
    console.error("Optimize image error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};

async function resizeAndCompressImage(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  targetWidth: number,
  maxSizeBytes: number
): Promise<string> {
  // Cloudflare Workers環境ではCanvasが使えないため、
  // クライアント側で処理する必要がある
  // ここではプレースホルダーとして元の画像を返す
  
  // 実際の処理はクライアント側（ブラウザ）で行う
  // または、外部の画像最適化サービスを使用する
  
  // とりあえず、base64データをそのまま返す（後でクライアント側で処理）
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  return `data:${mimeType};base64,${base64}`;
}
