// -*- coding: utf-8 -*-
/**
 * アフィリエイトリンクHTML挿入モジュール
 */

import type { ProductInfo } from "./product-builder";

/**
 * Pochippスタイルを取得
 */
export function getPochippStyles(): string {
  return `
    @keyframes floatGlow {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-2px);
      }
    }
    /* Pochipp Affiliate Box - 左に画像、右に説明、下にボタン2つ */
    .pochipp-box {
      display: flex;
      flex-direction: column;
      background: linear-gradient(
        135deg,
        rgba(255, 182, 193, 0.3) 0%,
        rgba(255, 218, 185, 0.3) 20%,
        rgba(255, 250, 205, 0.3) 40%,
        rgba(173, 216, 230, 0.3) 60%,
        rgba(216, 191, 216, 0.3) 80%,
        rgba(255, 182, 193, 0.3) 100%
      );
      animation: floatGlow 4s ease-in-out infinite;
      border-radius: 12px;
      box-shadow: 0 6px 22px rgba(255, 182, 193, 0.35), 0 0 27px rgba(173, 216, 230, 0.25);
      padding: 16px;
      margin: 24px 0;
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
    .pochipp-main {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 12px;
    }
    .pochipp-image {
      flex-shrink: 0;
      width: 100px;
      height: 100px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .pochipp-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .pochipp-info {
      flex: 1;
      min-width: 0;
    }
    .pochipp-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .pochipp-price {
      font-size: 1.125rem;
      font-weight: 700;
      color: #dc2626;
      margin: 6px 0;
      letter-spacing: 0.02em;
    }
    .pochipp-buttons {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    .pochipp-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .pochipp-btn-amazon {
      background: linear-gradient(135deg, #ff9900 0%, #ffad33 100%);
      color: white;
    }
    .pochipp-btn-amazon:hover {
      background: linear-gradient(135deg, #e68a00 0%, #ff9900 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 153, 0, 0.4);
    }
    .pochipp-btn-rakuten {
      background: linear-gradient(135deg, #bf0000 0%, #d42626 100%);
      color: white;
    }
    .pochipp-btn-rakuten:hover {
      background: linear-gradient(135deg, #a00000 0%, #bf0000 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(191, 0, 0, 0.4);
    }
    
    /* スマホ */
    @media (max-width: 640px) {
      .pochipp-main {
        gap: 12px;
      }
      .pochipp-image {
        width: 80px;
        height: 80px;
      }
      .pochipp-title {
        font-size: 0.875rem;
      }
      .pochipp-price {
        font-size: 1rem;
        margin: 4px 0;
      }
      .pochipp-btn {
        padding: 12px 16px;
        font-size: 0.875rem;
      }
    }
  `;
}

/**
 * ポチップHTMLを生成（左:画像、右:説明、下:ボタン2つ横並び）
 */
export function generatePochippHtml(product: ProductInfo): string {
  // 価格を3桁カンマ区切りにフォーマット
  const formattedPrice = product.price 
    ? Number(product.price).toLocaleString('ja-JP')
    : '';
  
  return `
    <div class="pochipp-box">
      <div class="pochipp-main">
        <div class="pochipp-image">
          <img src="${product.imageUrl}" alt="${product.title}" width="100" height="100" loading="lazy" />
        </div>
        <div class="pochipp-info">
          <div class="pochipp-title">${product.title}</div>
          ${formattedPrice ? `<div class="pochipp-price">¥${formattedPrice}</div>` : ''}
        </div>
      </div>
      <div class="pochipp-buttons">
        <a href="${product.amazonUrl}" class="pochipp-btn pochipp-btn-amazon" target="_blank" rel="noopener nofollow">Amazonで見る</a>
        <a href="${product.rakutenUrl}" class="pochipp-btn pochipp-btn-rakuten" target="_blank" rel="noopener nofollow">楽天市場で見る</a>
      </div>
    </div>
  `;
}
