import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeywordInput } from "./KeywordInput";
import { WorkflowProgress } from "./WorkflowProgress";
import { ArticlePreview } from "./ArticlePreview";
import { SettingsPanel } from "./SettingsPanel";
import { IconUploader } from "./IconUploader";
import { CostTracker, type TokenUsage, createTokenUsage } from "./CostTracker";
import { SavedArticlesList } from "./SavedArticlesList";
import { Zap, Settings } from "lucide-react";
import type { KeywordResearchResult } from "@/lib/api/keyword-research";
import { keywordResearchApi } from "@/lib/api/keyword-research";
import { articleGeneratorApi, type ArticleOutline, type GeneratedSection, type IconInfo } from "@/lib/api/article-generator";
import { fetchAllIcons, fetchIconsWithDataUrls } from "@/lib/api/icon-matcher";
import { useToast } from "@/hooks/use-toast";
import { saveArticle, saveCurrentArticle, loadCurrentArticle, type SavedArticle } from "@/lib/article-storage";

export type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
};

export type GeneratedArticle = {
  keyword: string;
  productKeyword?: string;
  slug?: string; // 記事のスラッグ（URL用）
  outline?: ArticleOutline;
  sections?: GeneratedSection[];
  // 画像URL（絶対URL - GitHub Pages）
  eyecatchImage?: { pc: string; mobile: string };
  sectionImages?: Array<{ pc: string; mobile: string } | null>;
  // 画像データ（Base64 - デプロイ用）
  imageDataList?: Array<{ filename: string; dataUrl: string }>;
  htmlContent?: string; // 絶対URLで埋め込まれたHTML
  totalCharCount?: number;
  researchData?: KeywordResearchResult;
};

export const Dashboard = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<GeneratedArticle | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [savedArticlesRefresh, setSavedArticlesRefresh] = useState(0);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: "research", title: "キーワード調査", description: "PAA・関連検索・サジェストを収集中", status: "pending" },
    { id: "outline", title: "構成作成", description: "H2/H3見出しを生成中", status: "pending" },
    { id: "content", title: "記事執筆", description: "10,000文字以上の記事を生成中", status: "pending" },
    { id: "images", title: "画像生成", description: "アイキャッチ・見出し画像を作成中", status: "pending" },
    { id: "products", title: "商品リンク", description: "アフィリエイト商品を検索中", status: "pending" },
    { id: "deploy", title: "デプロイ", description: "GitHub → Cloudflareにプッシュ中", status: "pending" },
  ]);
  const { toast } = useToast();

  // ページ読み込み時に保存済み記事を復元
  useEffect(() => {
    const saved = loadCurrentArticle();
    if (saved) {
      // 古い形式のデータを新しい形式に変換（念のため）
      const migratedArticle = {
        ...saved,
        eyecatchImage: saved.eyecatchImage || (saved as any).eyecatchImagePreview || (saved as any).eyecatchImage,
        sectionImages: saved.sectionImages || (saved as any).sectionImagesPreview || (saved as any).sectionImages,
      };
      
      setCurrentArticle(migratedArticle);
      toast({
        title: "前回の記事を復元しました",
        description: saved.keyword,
      });
    }
  }, []);

  // 記事が更新されたら自動保存
  useEffect(() => {
    if (currentArticle && currentArticle.htmlContent) {
      saveCurrentArticle(currentArticle);
      // 記事一覧にも保存
      saveArticle(currentArticle);
      setSavedArticlesRefresh(prev => prev + 1);
    }
  }, [currentArticle?.htmlContent]);

  const handleSelectSavedArticle = (article: SavedArticle) => {
    // 古い形式のデータを新しい形式に変換（念のため）
    const migratedArticle = {
      ...article,
      eyecatchImage: article.eyecatchImage || (article as any).eyecatchImagePreview || (article as any).eyecatchImage,
      sectionImages: article.sectionImages || (article as any).sectionImagesPreview || (article as any).sectionImages,
    };
    
    setCurrentArticle(migratedArticle);
    saveCurrentArticle(migratedArticle);
    toast({
      title: "記事を読み込みました",
      description: article.keyword,
    });
  };

  // HTMLを再生成（CSSのみ更新）
  const handleRegenerateHtml = async () => {
    if (!currentArticle?.outline || !currentArticle?.sections) {
      toast({
        title: "エラー",
        description: "再生成する記事データがありません",
        variant: "destructive",
      });
      return;
    }

    try {
      // アイコンを取得（Base64データURL付き）
      const allIcons = await fetchAllIcons();
      const icons = await fetchIconsWithDataUrls(allIcons, 30);
      
      // HTMLを再生成（絶対URLで埋め込む）
      const htmlContent = articleGeneratorApi.generateHtml(
        currentArticle.outline,
        currentArticle.sections,
        currentArticle.eyecatchImage,
        currentArticle.sectionImages,
        icons,
        [] // 商品リンクは既存のものを使うか、空にする
      );

      setCurrentArticle(prev => prev ? {
        ...prev,
        htmlContent,
      } : null);

      toast({
        title: "HTML再生成完了",
        description: "最新のCSSでHTMLを更新しました",
      });
    } catch (error) {
      console.error("HTML regeneration error:", error);
      toast({
        title: "エラー",
        description: "HTMLの再生成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const addTokenUsage = (step: string, inputTokens: number, outputTokens: number) => {
    setTokenUsage(prev => [...prev, createTokenUsage(step, inputTokens, outputTokens)]);
  };

  const updateStepStatus = (stepId: string, status: WorkflowStep["status"], description?: string) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, description: description || step.description } : step
    ));
  };

  const resetWorkflow = () => {
    setWorkflowSteps(prev => prev.map(step => ({
      ...step,
      status: "pending" as const,
    })));
    setTokenUsage([]); // トークン使用量もリセット
  };

  const handleStartGeneration = async (keyword: string, productKeyword: string, slug: string, htmlProducts?: Array<{ asin: string; title?: string; imageUrl?: string }>) => {
    setIsGenerating(true);
    resetWorkflow();
    // productKeywordが空の場合はkeywordを使用
    const effectiveProductKeyword = productKeyword || keyword;
    setCurrentArticle({ keyword, productKeyword: effectiveProductKeyword, slug });

    let researchData: KeywordResearchResult | undefined;
    let outline: ArticleOutline | undefined;
    let sections: GeneratedSection[] | undefined;

    try {
      // Step 1: Keyword Research
      updateStepStatus("research", "active", "PAA・関連検索を収集中...");
      
      const researchResponse = await keywordResearchApi.research(keyword);
      
      if (researchResponse.success && researchResponse.data) {
        researchData = researchResponse.data;
        const paaCount = researchData.paaQuestions.length;
        const relatedCount = researchData.relatedSearches.length;
        updateStepStatus("research", "completed", `PAA ${paaCount}件、関連検索 ${relatedCount}件取得`);
        
        // キーワード調査のトークン使用量を追加（概算）
        addTokenUsage("キーワード調査", 500, 2000);
        
        setCurrentArticle(prev => prev ? { ...prev, researchData } : null);
      } else {
        console.warn("[Dashboard] キーワード調査失敗:", {
          error: researchResponse.error,
          keyword,
        });
        updateStepStatus("research", "completed", "調査スキップ（エラー）");
      }

      // Step 2: Generate outline and content
      updateStepStatus("outline", "active", "H2/H3見出しを生成中...");
      
      const result = await articleGeneratorApi.generateFullArticle(
        keyword,
        researchData,
        (step, progress) => {
          console.log(`Progress: ${step} - ${progress}%`);
          
          if (progress <= 20) {
            updateStepStatus("outline", "active", step);
          } else if (progress < 90) {
            updateStepStatus("outline", "completed");
            updateStepStatus("content", "active", step);
          } else {
            updateStepStatus("content", "completed", `${step}`);
          }
        }
      );

      if (!result.outline) {
        const errorMsg = result.error || "記事の生成に失敗しました";
        const errorDetails = {
          error: errorMsg,
          keyword,
          hasResearchData: !!researchData,
          result: {
            success: result.success,
            hasOutline: !!result.outline,
            hasSections: !!result.sections,
            sectionCount: result.sections?.length || 0,
            totalCharCount: result.totalCharCount || 0,
          },
        };
        console.error("[Dashboard] 記事生成失敗:", errorDetails);
        toast({
          title: "生成エラー",
          description: `${errorMsg}\n\n詳細はブラウザのコンソール（F12）を確認してください。`,
          variant: "destructive",
          duration: 10000, // 10秒間表示
        });
        updateStepStatus("outline", "error");
        setIsGenerating(false);
        return;
      }

      outline = result.outline;
      sections = result.sections || [];

      // セクション数の不整合をチェック
      if (result.outline.h2Sections.length !== sections.length) {
        const errorMsg = result.error || `セクション生成の不整合が発生しました。期待: ${result.outline.h2Sections.length}個, 実際: ${sections.length}個`;
        console.error("[Dashboard] セクション数の不整合:", {
          expected: result.outline.h2Sections.length,
          actual: sections.length,
          outlineSections: result.outline.h2Sections.map((s, i) => `H2-${i + 1}: ${s.title}`),
          generatedSections: sections.map((s, i) => `H2-${i + 1}: ${s.h2Title}`),
        });
        
        toast({
          title: "⚠️ セクション生成エラー",
          description: `${errorMsg}\n\n生成されたセクション: ${sections.length}/${result.outline.h2Sections.length}\n詳細はブラウザのコンソール（F12）を確認してください。`,
          variant: "destructive",
          duration: 15000, // 15秒間表示
        });
        
        // エラーでも続行（成功したセクションのみを使用）
        if (sections.length === 0) {
          updateStepStatus("content", "error");
          setIsGenerating(false);
          return;
        }
      }

      // 構成作成のトークン使用量を追加（概算: H2数 x 1000 tokens）
      addTokenUsage("構成作成", 1000, 3000);
      
      // 記事執筆のトークン使用量を追加（概算: 文字数 x 1.5 tokens）
      const contentTokens = Math.round((result.totalCharCount || 0) * 1.5);
      addTokenUsage("記事執筆", 2000, contentTokens);

      updateStepStatus("outline", "completed");
      updateStepStatus("content", "completed", `${result.totalCharCount?.toLocaleString() || 0}文字生成完了`);

      // Step 3: Generate images (3 images: eyecatch + 2 H2 sections)
      updateStepStatus("images", "active", "アイキャッチ画像を生成中...");
      
      // デフォルトドメイン（設定から取得することも可能）
      const domain = "comic-review-navi.com"; // TODO: 設定から取得
      
      console.log(`📝 [Dashboard] 使用するスラッグ: ${slug}`);
      
      const imageResult = await articleGeneratorApi.generateArticleImages(
        outline,
        domain,
        slug,
        (step) => {
          updateStepStatus("images", "active", step);
        }
      );

      let eyecatchImage: { pc: string; mobile: string } | undefined;
      let sectionImages: Array<{ pc: string; mobile: string } | null> | undefined;
      let imageDataList: Array<{ filename: string; dataUrl: string }> | undefined;

      if (imageResult.success) {
        // 絶対URLを保存（プレビューもデプロイも同じ）
        eyecatchImage = imageResult.eyecatchImageAbsolute;
        sectionImages = imageResult.sectionImagesAbsolute;
        imageDataList = imageResult.imageDataList; // デプロイ時に再利用
        
        console.log("🖼️ [Dashboard] 画像URL確認:", {
          eyecatchImageAbsolute: imageResult.eyecatchImageAbsolute,
          eyecatchImage: imageResult.eyecatchImage,
          sectionImagesAbsolute: imageResult.sectionImagesAbsolute,
          sectionImages: imageResult.sectionImages,
          imageDataListCount: imageDataList?.length,
        });
        
        if (!eyecatchImage) {
          console.warn("⚠️ [Dashboard] eyecatchImageAbsoluteがundefinedです。eyecatchImageを使用します。");
          eyecatchImage = imageResult.eyecatchImage;
        }
        if (!sectionImages) {
          console.warn("⚠️ [Dashboard] sectionImagesAbsoluteがundefinedです。sectionImagesを使用します。");
          sectionImages = imageResult.sectionImages;
        }
        
        updateStepStatus("images", "completed", `画像3枚生成完了`);
        
        // 画像生成のトークン使用量を追加（概算: 3画像）
        // 画像生成モデルを使用しているため、modelTypeを"image"として指定
        setTokenUsage(prev => [...prev, createTokenUsage("画像生成", 500, 6000, "image")]);
      } else {
        console.warn("[Dashboard] 画像生成スキップ:", {
          error: imageResult.error,
          keyword,
        });
        // 画像なしでも記事は生成できるため、エラーではなく完了扱い
        updateStepStatus("images", "completed", "画像なしで続行");
      }

      // Fetch icons for speech bubbles (with Base64 data URLs for preview)
      const allIcons = await fetchAllIcons();
      const icons = await fetchIconsWithDataUrls(allIcons, 30);
      console.log(`Loaded ${icons.length} icons with data URLs for article`);

      // Step 4: Generate product links for affiliate
      updateStepStatus("products", "active", "アフィリエイト商品を検索中...");
      
      let productLinks: Array<{ h2Index: number; h3Index: number; product: { title: string; imageUrl: string; amazonUrl: string; rakutenUrl: string; } }> = [];
      
      if (sections) {
        try {
          productLinks = await articleGeneratorApi.generateProductLinks(
            effectiveProductKeyword,
            keyword, // メインキーワード（Amazon検索用）
            sections,
            (step) => {
              updateStepStatus("products", "active", step);
            },
            htmlProducts // HTMLファイルから抽出した商品情報リスト
          );
          updateStepStatus("products", "completed", `商品${productLinks.length}件取得完了`);
          
          // 商品検索のトークン使用量を追加（概算: 商品数 x 500 tokens）
          addTokenUsage("商品リンク", 300, productLinks.length * 500);
        } catch (productError) {
          console.warn("[Dashboard] 商品リンク生成失敗:", {
            error: productError,
            errorType: productError instanceof Error ? productError.constructor.name : typeof productError,
            errorMessage: productError instanceof Error ? productError.message : String(productError),
            errorStack: productError instanceof Error ? productError.stack : undefined,
            keyword,
            productKeyword: effectiveProductKeyword,
          });
          updateStepStatus("products", "completed", "商品検索スキップ（エラー）");
        }
      } else {
        updateStepStatus("products", "completed", "商品検索スキップ");
      }

      // Generate HTML with images, icons, and product links（絶対URLで埋め込む）
      console.log("🔨 [Dashboard] HTML生成前の画像URL確認:", {
        eyecatchImage,
        sectionImages,
      });
      
      const htmlContent = sections 
        ? articleGeneratorApi.generateHtml(outline, sections, eyecatchImage, sectionImages, icons, productLinks)
        : undefined;
      
      // HTMLに埋め込まれた画像URLを確認
      if (htmlContent) {
        const eyecatchMatch = htmlContent.match(/srcset="([^"]+)"/);
        if (eyecatchMatch) {
          console.log("📝 [Dashboard] HTMLに埋め込まれた画像URL:", eyecatchMatch[1]);
        }
      }

      setCurrentArticle(prev => prev ? {
        ...prev,
        outline,
        sections,
        totalCharCount: result.totalCharCount,
        eyecatchImage,
        sectionImages,
        imageDataList, // デプロイ時に使用
        htmlContent,
      } : null);

      toast({
        title: "記事生成完了",
        description: `${result.totalCharCount?.toLocaleString() || 0}文字の記事と画像3枚、商品${productLinks.length}件を生成しました`,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "記事の生成中にエラーが発生しました";
      const errorType = error instanceof Error ? error.constructor.name : typeof error;
      
      console.error("[Dashboard] ❌ 記事生成エラー:", {
        error,
        errorType,
        errorMessage: errorMsg,
        errorStack: error instanceof Error ? error.stack : undefined,
        fullError: error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : String(error),
        currentState: {
          keyword,
          productKeyword: effectiveProductKeyword,
          hasResearchData: !!researchData,
          hasOutline: !!outline,
          hasSections: !!sections,
        },
      });
      
      toast({
        title: "生成エラー",
        description: `${errorMsg}\n\nエラー種別: ${errorType}\n詳細はブラウザのコンソール（F12）を確認してください。`,
        variant: "destructive",
        duration: 10000, // 10秒間表示
      });
      updateStepStatus("research", "error");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(180_70%_45%)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AutoBlog Deploy</h1>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-57px)]">
        {/* Left Sidebar - Compact Input & Workflow */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0 border-r border-border/50 overflow-y-auto p-4 space-y-4 bg-card/30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <KeywordInput 
              onSubmit={handleStartGeneration}
              isLoading={isGenerating}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <WorkflowProgress steps={workflowSteps} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <IconUploader />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CostTracker usage={tokenUsage} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <SavedArticlesList 
              onSelectArticle={handleSelectSavedArticle}
              refreshTrigger={savedArticlesRefresh}
            />
          </motion.div>
        </div>

        {/* Right Column - Preview (Maximum Width) */}
        <div className="flex-1 overflow-y-auto p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full"
          >
            <ArticlePreview 
              article={currentArticle}
              isGenerating={isGenerating}
              onRegenerateHtml={handleRegenerateHtml}
              onArticleUpdate={(updatedArticle) => {
                setCurrentArticle(updatedArticle);
                saveCurrentArticle(updatedArticle);
              }}
            />
          </motion.div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
