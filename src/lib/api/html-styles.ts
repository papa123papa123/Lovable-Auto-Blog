// セクション用の背景色パレット（パステル調）- H3ごとにも使用
export const SECTION_COLORS = [
  { bg: '#fef7f0', heading: '#f97316', headingBg: '#fff7ed', border: '#fdba74' }, // オレンジ
  { bg: '#f0fdf4', heading: '#22c55e', headingBg: '#dcfce7', border: '#86efac' }, // グリーン
  { bg: '#eff6ff', heading: '#3b82f6', headingBg: '#dbeafe', border: '#93c5fd' }, // ブルー
  { bg: '#fdf4ff', heading: '#d946ef', headingBg: '#fae8ff', border: '#e879f9' }, // パープル
  { bg: '#fefce8', heading: '#eab308', headingBg: '#fef9c3', border: '#fde047' }, // イエロー
  { bg: '#f0fdfa', heading: '#14b8a6', headingBg: '#ccfbf1', border: '#5eead4' }, // ティール
  { bg: '#fff1f2', heading: '#f43f5e', headingBg: '#ffe4e6', border: '#fda4af' }, // ローズ
  { bg: '#f8fafc', heading: '#64748b', headingBg: '#e2e8f0', border: '#94a3b8' }, // グレー
];

// 半透明下線マーカー用のスタイル
export function getMarkerStyles(): string {
  return `
    /* 半透明下線マーカー - 多色バリエーション */
    .marker-yellow,
    mark.marker-yellow {
      background: linear-gradient(transparent 50%, rgba(254,240,138,0.7) 50%);
      padding: 2px 4px;
      border-radius: 2px;
    }
    
    .marker-blue,
    mark.marker-blue {
      background: transparent;
      border-bottom: 3px solid rgba(96,165,250,0.6);
      padding: 2px 4px;
    }
    
    .marker-pink,
    mark.marker-pink {
      background: linear-gradient(transparent 50%, rgba(251,207,232,0.7) 50%);
      padding: 2px 4px;
      border-radius: 2px;
    }
    
    .marker-green,
    mark.marker-green {
      background: linear-gradient(transparent 50%, rgba(187,247,208,0.7) 50%);
      padding: 2px 4px;
      border-radius: 2px;
    }
    
    .marker-orange,
    mark.marker-orange {
      background: linear-gradient(transparent 50%, rgba(253,186,116,0.7) 50%);
      padding: 2px 4px;
      border-radius: 2px;
    }
    
    .marker-purple,
    mark.marker-purple {
      background: transparent;
      border-bottom: 3px solid rgba(192,132,252,0.6);
      padding: 2px 4px;
    }
    
    .marker-teal,
    mark.marker-teal {
      background: transparent;
      border-bottom: 3px solid rgba(94,234,212,0.6);
      padding: 2px 4px;
    }
    
    /* 太字にマーカーを組み合わせたスタイル */
    strong mark,
    mark strong {
      font-weight: 700;
    }
  `;
}

// テーブル用のカラフルなスタイルを取得
export function getTableStyles(): string {
  return `
    /* Infographic Tables */
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 24px 0;
      font-size: 0.875rem;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      table-layout: auto;
    }
    .info-table th,
    .info-table td {
      writing-mode: horizontal-tb !important;
      text-orientation: mixed;
      white-space: normal;
      word-break: break-word;
      min-width: 80px;
    }
    .info-table th {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 700;
      font-size: 0.8125rem;
      letter-spacing: 0.02em;
      border-bottom: 3px solid rgba(96,165,250,0.8);
    }
    .info-table th:first-child {
      border-radius: 12px 0 0 0;
    }
    .info-table th:last-child {
      border-radius: 0 12px 0 0;
    }
    .info-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: white;
      font-weight: 600;
    }
    .info-table tr:nth-child(even) td {
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
    }
    .info-table tr:nth-child(odd) td {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }
    /* 表の最初の列（項目名）に下線マーカー */
    .info-table td:first-child {
      border-bottom: 3px solid rgba(192,132,252,0.5);
    }
    /* 表の2列目以降（比較項目）に統一色の下線マーカー */
    .info-table td:not(:first-child) {
      border-bottom: 3px solid rgba(94,234,212,0.5);
    }
    .info-table tr:last-child td {
      border-bottom: none;
    }
    .info-table tr:last-child td:first-child {
      border-radius: 0 0 0 12px;
    }
    .info-table tr:last-child td:last-child {
      border-radius: 0 0 12px 0;
    }
    .info-table tr:hover td {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    }
    
    /* スマホ用テーブルのレスポンシブ対応 */
    @media (max-width: 640px) {
      .info-table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .info-table th,
      .info-table td {
        padding: 10px 12px;
        font-size: 0.8125rem;
        min-width: 100px;
      }
    }
  `;
}

// 目次（TOC）のスタイルを取得 - 最初は折りたたみ、下部は常に展開
export function getTocStyles(): string {
  return `
    /* Table of Contents - 折りたたみ式（上部） */
    .toc-container {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 16px;
      padding: 0;
      margin: 24px 0 40px;
      border: 1px solid #cbd5e1;
      overflow: hidden;
    }
    .toc-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      border: none;
      cursor: pointer;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      text-align: left;
    }
    .toc-toggle:hover {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
    }
    .toc-toggle::before {
      content: "📑";
      margin-right: 8px;
    }
    .toc-toggle-icon {
      transition: transform 0.3s ease;
      font-size: 0.75rem;
    }
    .toc-container.open .toc-toggle-icon {
      transform: rotate(180deg);
    }
    .toc-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      padding: 0 24px;
    }
    .toc-container.open .toc-content {
      max-height: 2000px;
      padding: 20px 24px;
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .toc-item-h2 {
      margin: 8px 0;
    }
    .toc-item-h2 > a {
      display: block;
      padding: 10px 16px;
      background: white;
      border-radius: 8px;
      color: #1e293b;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      border-left: 4px solid #3b82f6;
      transition: all 0.2s;
    }
    .toc-item-h2 > a:hover {
      background: #dbeafe;
      transform: translateX(4px);
    }
    .toc-sublist {
      list-style: none;
      padding: 0 0 0 24px;
      margin: 4px 0 0;
    }
    .toc-item-h3 {
      margin: 4px 0;
    }
    .toc-item-h3 a {
      display: block;
      padding: 6px 12px;
      color: #64748b;
      text-decoration: none;
      font-size: 0.8125rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .toc-item-h3 a:hover {
      background: #f1f5f9;
      color: #3b82f6;
    }
    
    /* 記事下の目次（常に展開） */
    .toc-bottom {
      margin-top: 48px;
      padding: 20px 24px;
      border-top: 2px solid #e2e8f0;
    }
    .toc-bottom .toc-toggle {
      display: none;
    }
    .toc-bottom .toc-content {
      max-height: none;
      padding: 0;
    }
    .toc-bottom .toc-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .toc-bottom .toc-title::before {
      content: "📋";
    }
  `;
}

// ポチップ（アフィリエイトリンク）のスタイルを取得 - 参考サイト風
// Pochippスタイルは affiliate/html-inserter.ts に移動
export { getPochippStyles } from "./affiliate/html-inserter";

// セクション背景のスタイルを取得
export function getSectionStyles(): string {
  return `
    /* Section Backgrounds */
    .section-wrapper {
      padding: 32px 24px;
      margin: 0 -24px;
      border-radius: 0;
    }
    @media (min-width: 768px) {
      .section-wrapper {
        padding: 40px 32px;
        margin: 24px -32px;
        border-radius: 24px;
      }
    }
    .section-wrapper h2 {
      margin-top: 0;
      padding: 20px 24px;
      border-radius: 12px;
      font-size: 1.25rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    @media (min-width: 768px) {
      .section-wrapper h2 {
        font-size: 1.375rem;
      }
    }
    
    /* H3 within sections - 背景色を交互に */
    .section-wrapper h3 {
      margin-top: 28px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 8px;
      border-left-width: 5px;
    }
    
    /* H3コンテンツごとの背景ラッパー */
    .h3-wrapper {
      padding: 20px;
      margin: 16px -20px;
      border-radius: 16px;
    }
    @media (max-width: 640px) {
      .h3-wrapper {
        padding: 16px;
        margin: 12px -16px;
        border-radius: 12px;
      }
    }
    
    /* Section intro and H3 content - 重要：段組み禁止 */
    .section-intro,
    .h3-content {
      column-count: 1 !important;
      columns: 1 !important;
      display: block !important;
      writing-mode: horizontal-tb !important;
      text-orientation: mixed !important;
    }
    .h3-content p,
    .h3-content div:not(.bubble-left):not(.bubble-right):not(.pochipp-box):not(.pochipp-main):not(.pochipp-buttons):not(.pochipp-image):not(.pochipp-info),
    .h3-content ul,
    .h3-content ol,
    .section-intro p,
    .section-intro div:not(.bubble-left):not(.bubble-right):not(.pochipp-box):not(.pochipp-main):not(.pochipp-buttons):not(.pochipp-image):not(.pochipp-info) {
      column-count: 1 !important;
      columns: 1 !important;
      display: block !important;
      writing-mode: horizontal-tb !important;
    }
    /* pochipp-buttonsのflex表示を強制 */
    .pochipp-buttons {
      display: flex !important;
    }
    
    /* まとめセクション */
    .summary-section {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 16px;
      padding: 32px;
      margin: 40px 0;
      border: 2px solid #f59e0b;
    }
    .summary-section h2 {
      color: #92400e;
      margin-bottom: 20px;
    }
    .summary-list {
      list-style: none;
      padding: 0;
    }
    .summary-list li {
      padding: 12px 0 12px 32px;
      position: relative;
      border-bottom: 1px dashed #d97706;
    }
    .summary-list li:last-child {
      border-bottom: none;
    }
    .summary-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
      font-size: 1.25rem;
    }
    
    /* 関連記事セクション */
    .related-articles {
      background: #f8fafc;
      border-radius: 16px;
      padding: 24px;
      margin: 40px 0;
      border: 1px solid #e2e8f0;
    }
    .related-articles h3 {
      font-size: 1.125rem;
      color: #1e293b;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .related-articles h3::before {
      content: "📚";
    }
    .related-placeholder {
      color: #94a3b8;
      font-size: 0.875rem;
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      border: 2px dashed #cbd5e1;
    }
  `;
}

// 目次HTMLを生成（折りたたみ式 - 上部用）
export function generateTocHtml(outline: { title: string; h2Sections: Array<{ title: string; h3Headings: string[] }> }): string {
  let tocHtml = `
    <div class="toc-container" id="toc">
      <button class="toc-toggle" onclick="const container = this.parentElement; const isOpen = container.classList.toggle('open'); this.setAttribute('aria-expanded', isOpen);" aria-label="目次を開く/閉じる" aria-expanded="false">
        目次を見る
        <span class="toc-toggle-icon">▼</span>
      </button>
      <div class="toc-content">
        <ul class="toc-list">
  `;

  outline.h2Sections.forEach((section, h2Index) => {
    const h2Id = `section-${h2Index + 1}`;
    tocHtml += `
          <li class="toc-item-h2">
            <a href="#${h2Id}">${section.title}</a>
            <ul class="toc-sublist">
    `;
    
    section.h3Headings.forEach((h3, h3Index) => {
      const h3Id = `section-${h2Index + 1}-${h3Index + 1}`;
      tocHtml += `
              <li class="toc-item-h3"><a href="#${h3Id}">${h3}</a></li>
      `;
    });
    
    tocHtml += `
            </ul>
          </li>
    `;
  });

  tocHtml += `
        </ul>
      </div>
    </div>
  `;

  return tocHtml;
}

// 記事下の目次HTMLを生成（常に展開）
export function generateBottomTocHtml(outline: { title: string; h2Sections: Array<{ title: string; h3Headings: string[] }> }): string {
  let tocHtml = `
    <div class="toc-container toc-bottom">
      <div class="toc-title">この記事の目次</div>
      <ul class="toc-list">
  `;

  outline.h2Sections.forEach((section, h2Index) => {
    const h2Id = `section-${h2Index + 1}`;
    tocHtml += `
        <li class="toc-item-h2">
          <a href="#${h2Id}">${section.title}</a>
          <ul class="toc-sublist">
    `;
    
    section.h3Headings.forEach((h3, h3Index) => {
      const h3Id = `section-${h2Index + 1}-${h3Index + 1}`;
      tocHtml += `
            <li class="toc-item-h3"><a href="#${h3Id}">${h3}</a></li>
      `;
    });
    
    tocHtml += `
          </ul>
        </li>
    `;
  });

  tocHtml += `
      </ul>
    </div>
  `;

  return tocHtml;
}

// PochippHTML生成は affiliate/html-inserter.ts に移動
export { generatePochippHtml } from "./affiliate/html-inserter";

// まとめセクションHTMLを生成
export function generateSummaryHtml(outline: { title: string; h2Sections: Array<{ title: string; h3Headings: string[] }> }): string {
  return `
    <div class="summary-section" id="section-summary">
      <h2>📝 まとめ：${outline.title}</h2>
      <p>この記事では、<strong>${outline.title}</strong>について詳しく解説しました。</p>
      <p>重要なポイントをおさらいしましょう：</p>
      <ul class="summary-list">
        ${outline.h2Sections.map(section => `<li><strong>${section.title}</strong></li>`).join('\n        ')}
      </ul>
      <div class="ok-box" style="margin-top: 20px;">
        ✅ 今回ご紹介した商品は、いずれも人気・実績ともに高い商品です。ぜひ購入の参考にしてください！
      </div>
    </div>
  `;
}

// 関連記事セクションHTMLを生成
export function generateRelatedArticlesHtml(): string {
  return `
    <div class="related-articles">
      <h3>関連記事</h3>
      <div class="related-placeholder">
        関連記事は今後追加されます。
      </div>
    </div>
  `;
}

// すべてのスタイルを統合して返す
export function getAllStyles(): string {
  return `
    ${getMarkerStyles()}
    ${getTableStyles()}
    ${getTocStyles()}
    ${getSectionStyles()}
  `;
}