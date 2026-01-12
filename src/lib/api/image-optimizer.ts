// -*- coding: utf-8 -*-
// クライアント側で画像を最適化（WebP変換、リサイズ、圧縮）

export interface OptimizedImages {
  pc: string; // 800px幅のWebP (data URL)
  mobile: string; // 350px幅のWebP (data URL)
}

/**
 * Base64画像をWebP形式に変換し、PC用とスマホ用の2サイズを生成
 */
export async function optimizeImage(
  imageDataUrl: string,
  targetPcWidth: number = 800,
  targetMobileWidth: number = 350
): Promise<OptimizedImages> {
  // data:image/xxx;base64,... から画像を読み込む
  const img = await loadImage(imageDataUrl);

  // アスペクト比を維持して高さを計算
  const aspectRatio = img.height / img.width;

  // PC用画像を生成 (800px, 30KB以下)
  const pcDataUrl = await resizeAndCompressToWebP(
    img,
    targetPcWidth,
    Math.round(targetPcWidth * aspectRatio),
    30 * 1024 // 30KB
  );

  // スマホ用画像を生成 (350px, 10KB以下)
  const mobileDataUrl = await resizeAndCompressToWebP(
    img,
    targetMobileWidth,
    Math.round(targetMobileWidth * aspectRatio),
    10 * 1024 // 10KB
  );

  console.log(`[ImageOptimizer] PC画像: ${Math.round(dataUrlToSize(pcDataUrl) / 1024)}KB`);
  console.log(`[ImageOptimizer] スマホ画像: ${Math.round(dataUrlToSize(mobileDataUrl) / 1024)}KB`);

  return {
    pc: pcDataUrl,
    mobile: mobileDataUrl,
  };
}

/**
 * data URLから画像要素を作成
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 画像をリサイズしてWebP形式に変換、指定サイズ以下に圧縮
 */
async function resizeAndCompressToWebP(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  maxSizeBytes: number
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // 画像を描画
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // WebPに変換（品質を調整しながらサイズを削減）
  let quality = 0.9;
  let dataUrl = canvas.toDataURL("image/webp", quality);
  let attempts = 0;
  const maxAttempts = 10;

  // 目標サイズ以下になるまで品質を下げる
  while (dataUrlToSize(dataUrl) > maxSizeBytes && attempts < maxAttempts) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/webp", quality);
    attempts++;
  }

  // 最終的に目標サイズを超える場合でも、最小品質の画像を返す
  if (dataUrlToSize(dataUrl) > maxSizeBytes) {
    console.warn(
      `[ImageOptimizer] 目標サイズ ${Math.round(maxSizeBytes / 1024)}KB を達成できませんでした。` +
      `最終サイズ: ${Math.round(dataUrlToSize(dataUrl) / 1024)}KB (品質: ${quality.toFixed(1)})`
    );
  }

  return dataUrl;
}

/**
 * data URLのバイト数を計算
 */
function dataUrlToSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1];
  // Base64は元のデータの約4/3のサイズになる
  return Math.ceil(base64.length * 0.75);
}
