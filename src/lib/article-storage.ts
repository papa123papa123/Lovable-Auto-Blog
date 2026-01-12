import type { GeneratedArticle } from "@/components/Dashboard";

const STORAGE_KEY = "saved-articles";
const CURRENT_ARTICLE_KEY = "current-article";

export type SavedArticle = GeneratedArticle & {
  id: string;
  savedAt: string;
  slug?: string;
  deployed?: boolean;
  deployedAt?: string;
};

// 保存済み記事一覧を取得
export const loadSavedArticles = (): SavedArticle[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const articles = JSON.parse(saved);
      // 古い形式のデータを新しい形式に変換
      return articles.map((article: any) => migrateArticleData(article));
    }
  } catch (e) {
    console.error("Failed to load saved articles:", e);
  }
  return [];
};

// 記事を保存
export const saveArticle = (article: GeneratedArticle, slug?: string): SavedArticle => {
  const articles = loadSavedArticles();
  
  const savedArticle: SavedArticle = {
    ...article,
    id: `article-${Date.now()}`,
    savedAt: new Date().toISOString(),
    slug,
    deployed: false,
  };
  
  // 同じキーワードの記事があれば更新、なければ追加
  const existingIndex = articles.findIndex(a => a.keyword === article.keyword);
  if (existingIndex >= 0) {
    savedArticle.id = articles[existingIndex].id; // IDを維持
    articles[existingIndex] = savedArticle;
  } else {
    articles.unshift(savedArticle); // 先頭に追加
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (e) {
    console.error("Failed to save article:", e);
    // ストレージ容量オーバーの場合、画像データを削除して再試行
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const lightArticles = articles.map(a => ({
        ...a,
        eyecatchImage: undefined, // 画像を削除して容量節約
        sectionImages: undefined,
      }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightArticles));
      } catch {
        // それでもダメなら古い記事から削除
        const reduced = articles.slice(0, Math.floor(articles.length / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
      }
    }
  }
  
  return savedArticle;
};

// 記事を削除
export const deleteArticle = (id: string): void => {
  const articles = loadSavedArticles();
  const filtered = articles.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// 記事のデプロイ状態を更新
export const markAsDeployed = (id: string): void => {
  const articles = loadSavedArticles();
  const updated = articles.map(a => 
    a.id === id ? { ...a, deployed: true, deployedAt: new Date().toISOString() } : a
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// 現在編集中の記事を一時保存
export const saveCurrentArticle = (article: GeneratedArticle | null): void => {
  try {
    if (article) {
      localStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(article));
    } else {
      localStorage.removeItem(CURRENT_ARTICLE_KEY);
    }
  } catch (e) {
    console.error("Failed to save current article:", e);
  }
};

/**
 * 古い形式の記事データを新しい形式に変換
 * 既存のlocalStorageデータは古いフィールド名を使っている可能性がある
 */
function migrateArticleData(article: any): GeneratedArticle {
  // 古いフィールド名が存在する場合、新しいフィールド名にコピー
  if (!article.eyecatchImage) {
    article.eyecatchImage = article.eyecatchImagePreview || article.eyecatchImageHtml || article.eyecatchImage;
  }
  if (!article.sectionImages) {
    article.sectionImages = article.sectionImagesPreview || article.sectionImagesHtml || article.sectionImages;
  }
  
  // 古いフィールドを削除（念のため）
  delete article.eyecatchImagePreview;
  delete article.eyecatchImageHtml;
  delete article.sectionImagesPreview;
  delete article.sectionImagesHtml;
  delete article.htmlContentPreview;
  
  return article;
}

// 現在編集中の記事を復元
export const loadCurrentArticle = (): GeneratedArticle | null => {
  try {
    const saved = localStorage.getItem(CURRENT_ARTICLE_KEY);
    if (saved) {
      const article = JSON.parse(saved);
      return migrateArticleData(article);
    }
  } catch (e) {
    console.error("Failed to load current article:", e);
  }
  return null;
};

// 記事をIDで取得
export const getArticleById = (id: string): SavedArticle | undefined => {
  const articles = loadSavedArticles();
  return articles.find(a => a.id === id);
};

// ストレージ使用量を取得（概算）
export const getStorageUsage = (): { used: number; total: number; percentage: number } => {
  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage.getItem(key)?.length || 0;
    }
  }
  // LocalStorageは通常5MB制限
  const total = 5 * 1024 * 1024;
  return {
    used,
    total,
    percentage: (used / total) * 100,
  };
};
