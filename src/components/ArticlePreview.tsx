import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Image, Code, Copy, Check, Download, Eye, Monitor, Tablet, Smartphone, Github, Loader2, RefreshCw, Edit3, Save } from "lucide-react";
import type { GeneratedArticle } from "./Dashboard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { deployToGitHub, batchDeployToGitHub, GITHUB_CONFIG } from "@/lib/api/github-deploy";
import { autoUpdateToppageAndSeo } from "@/lib/api/auto-update-toppage";
import { Textarea } from "./ui/textarea";
import { VisualBlockEditor, blocksToHtml, type ContentBlock } from "./VisualBlockEditor";
type ArticlePreviewProps = {
  article: GeneratedArticle | null;
  isGenerating: boolean;
  onRegenerateHtml?: () => void;
  onArticleUpdate?: (updatedArticle: GeneratedArticle) => void;
};
type ViewMode = "structure" | "preview" | "html" | "edit";
type DeviceMode = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px"
};

export const ArticlePreview = ({
  article,
  isGenerating,
  onRegenerateHtml,
  onArticleUpdate
}: ArticlePreviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("structure");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [domain, setDomain] = useState("comic-review-navi.com");
  const [slug, setSlug] = useState(article?.slug || "");
  const [editedArticle, setEditedArticle] = useState<GeneratedArticle | null>(null);
  const [editingIndex, setEditingIndex] = useState<{h2Index: number; h3Index?: number} | null>(null);
  const [visualEditMode, setVisualEditMode] = useState<'html' | 'visual'>('visual');
  const {
    toast
  } = useToast();

  // articleが変わった時にslugを更新（最初に生成されたslugを使用）
  useEffect(() => {
    if (article?.slug) {
      setSlug(article.slug);
    }
  }, [article?.slug]);

  // 編集用の記事データを取得（編集中なら編集版、そうでなければ元のデータ）
  const workingArticle = editedArticle || article;

  // リンク切れを検出
  const detectBrokenLinks = (htmlContent: string): string[] => {
    const brokenLinks: string[] = [];
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
    let match;
    
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const url = match[1];
      // 空リンク、#のみ、javascript:などを検出
      if (!url || url === '#' || url.startsWith('javascript:') || url === 'undefined') {
        brokenLinks.push(url || '(空)');
      }
    }
    
    return brokenLinks;
  };

  // 全セクションのリンク切れを検出
  const allBrokenLinks = useMemo(() => {
    if (!workingArticle?.sections) return [];
    
    const links: Array<{h2Index: number; h3Index?: number; link: string}> = [];
    
    workingArticle.sections.forEach((section, h2Index) => {
      const brokenInH2 = detectBrokenLinks(section.content);
      brokenInH2.forEach(link => links.push({h2Index, link}));
      
      section.h3Contents.forEach((h3, h3Index) => {
        const brokenInH3 = detectBrokenLinks(h3.content);
        brokenInH3.forEach(link => links.push({h2Index, h3Index, link}));
      });
    });
    
    return links;
  }, [workingArticle?.sections]);
  // 編集モードに切り替え
  const handleStartEdit = () => {
    setEditedArticle(article);
    setViewMode("edit");
  };

  // 編集内容を保存
  const handleSaveEdit = () => {
    if (editedArticle && onArticleUpdate) {
      onArticleUpdate(editedArticle);
      toast({
        title: "保存完了",
        description: "編集内容を保存しました。HTMLを再生成してください。"
      });
      setViewMode("structure");
    }
  };

  // セクション内容を更新
  const handleUpdateSection = (h2Index: number, field: 'h2Title' | 'content', value: string) => {
    if (!editedArticle || !editedArticle.sections) return;
    const newSections = [...editedArticle.sections];
    newSections[h2Index] = {
      ...newSections[h2Index],
      [field]: value
    };
    setEditedArticle({
      ...editedArticle,
      sections: newSections
    });
  };

  // ビジュアルエディタからブロックを保存
  const handleSaveVisualBlocks = (h2Index: number, h3Index: number | undefined, blocks: ContentBlock[]) => {
    if (!editedArticle || !editedArticle.sections) return;
    
    const html = blocksToHtml(blocks);
    
    if (h3Index !== undefined) {
      // H3の内容を更新
      handleUpdateH3(h2Index, h3Index, 'content', html);
    } else {
      // H2の内容を更新
      handleUpdateSection(h2Index, 'content', html);
    }
    
    setEditingIndex(null);
  };

  // H3セクション内容を更新
  const handleUpdateH3 = (h2Index: number, h3Index: number, field: 'title' | 'content', value: string) => {
    if (!editedArticle || !editedArticle.sections) return;
    const newSections = [...editedArticle.sections];
    const newH3Contents = [...newSections[h2Index].h3Contents];
    newH3Contents[h3Index] = {
      ...newH3Contents[h3Index],
      [field]: value
    };
    newSections[h2Index] = {
      ...newSections[h2Index],
      h3Contents: newH3Contents
    };
    setEditedArticle({
      ...editedArticle,
      sections: newSections
    });
  };

  // リンク切れを自動修正
  const handleFixBrokenLinks = () => {
    if (!editedArticle?.sections) return;
    
    let fixCount = 0;
    const newSections = editedArticle.sections.map(section => {
      // H2本文のリンク修正
      let newContent = section.content;
      newContent = newContent.replace(/href="undefined"/g, () => { fixCount++; return 'href="#"'; });
      newContent = newContent.replace(/href=""/g, () => { fixCount++; return 'href="#"'; });
      newContent = newContent.replace(/href="javascript:"/g, () => { fixCount++; return 'href="#"'; });
      
      // H3のリンク修正
      const newH3Contents = section.h3Contents.map(h3 => {
        let newH3Content = h3.content;
        newH3Content = newH3Content.replace(/href="undefined"/g, () => { fixCount++; return 'href="#"'; });
        newH3Content = newH3Content.replace(/href=""/g, () => { fixCount++; return 'href="#"'; });
        newH3Content = newH3Content.replace(/href="javascript:"/g, () => { fixCount++; return 'href="#"'; });
        return { ...h3, content: newH3Content };
      });
      
      return { ...section, content: newContent, h3Contents: newH3Contents };
    });
    
    setEditedArticle({
      ...editedArticle,
      sections: newSections
    });
    
    toast({
      title: "リンク修正完了",
      description: `${fixCount} 件のリンクを修正しました`
    });
  };

  const handleCopyHtml = async () => {
    if (!article?.htmlContent) return;
    try {
      await navigator.clipboard.writeText(article.htmlContent);
      setCopied(true);
      toast({
        title: "コピー完了",
        description: "HTMLをクリップボードにコピーしました"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "コピー失敗",
        description: "クリップボードへのアクセスに失敗しました",
        variant: "destructive"
      });
    }
  };
  const handleDownloadHtml = () => {
    if (!article?.htmlContent || !article.outline) return;
    const blob = new Blob([article.htmlContent], {
      type: "text/html"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.keyword.replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "ダウンロード開始",
      description: "HTMLファイルをダウンロードしました"
    });
  };

  const handleDeployToGitHub = async () => {
    if (!article?.htmlContent || !domain || !slug) {
      toast({
        title: "入力エラー",
        description: "ドメインとスラッグを入力してください",
        variant: "destructive"
      });
      return;
    }

    setDeploying(true);
    try {
      let result;
      
      // 画像データがある場合は一括デプロイ（1コミット）
      if (article.imageDataList && article.imageDataList.length > 0) {
        console.log(`[Deploy] 一括デプロイモード: ${article.imageDataList.length}枚の画像 + HTML`);
        result = await batchDeployToGitHub({
          domain,
          slug,
          htmlContent: article.htmlContent,
          images: article.imageDataList,
        });
      } else {
        // 画像データがない場合は従来のHTMLのみデプロイ
        console.log("[Deploy] HTMLのみデプロイモード");
        result = await deployToGitHub({
          domain,
          slug,
          htmlContent: article.htmlContent,
        });
      }

      if (result.success) {
        const deployedFiles = article.imageDataList?.length 
          ? `${article.imageDataList.length}枚の画像 + HTML を1コミット` 
          : "HTML";
        
        toast({
          title: "デプロイ完了 🎉",
          description: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo} に${deployedFiles}でプッシュしました`,
        });
        
        // トップページとSEOファイルを自動更新
        console.log('[Deploy] トップページ・SEOファイル自動更新を開始...');
        try {
          const updateResult = await autoUpdateToppageAndSeo({ domain });
          
          if (updateResult.success && updateResult.filesUpdated) {
            toast({
              title: "自動更新完了 ✨",
              description: `トップページとSEOファイル（${updateResult.filesUpdated.join(', ')}）を自動更新しました`,
            });
          } else if (updateResult.error) {
            console.warn('[Deploy] 自動更新エラー:', updateResult.error);
            toast({
              title: "自動更新スキップ",
              description: `トップページの自動更新に失敗しましたが、記事のデプロイは成功しています`,
              variant: "default",
            });
          }
        } catch (autoUpdateError) {
          console.error('[Deploy] 自動更新エラー:', autoUpdateError);
          // エラーが発生してもデプロイは成功しているので、警告のみ表示
          toast({
            title: "自動更新スキップ",
            description: `記事のデプロイは成功しましたが、トップページの自動更新に失敗しました`,
            variant: "default",
          });
        }
        
        setShowDeployForm(false);
      } else {
        toast({
          title: "デプロイ失敗",
          description: result.error || "GitHubへのプッシュに失敗しました",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "不明なエラー",
        variant: "destructive"
      });
    } finally {
      setDeploying(false);
    }
  };


  // Create blob URL for iframe preview
  const previewUrl = useMemo(() => {
    if (!article?.htmlContent) return null;
    
    let htmlContent = article.htmlContent;
    
    // 🔍 相対パスを絶対URLに置換（プレビュー用）
    if (article.eyecatchImagePreview) {
      // アイキャッチ画像のPC版
      htmlContent = htmlContent.replace(
        /srcset="images\/eyecatch-800\.webp"/g,
        `srcset="${article.eyecatchImagePreview.pc}"`
      );
      htmlContent = htmlContent.replace(
        /src="images\/eyecatch-800\.webp"/g,
        `src="${article.eyecatchImagePreview.pc}"`
      );
      
      // アイキャッチ画像のモバイル版
      htmlContent = htmlContent.replace(
        /srcset="images\/eyecatch-350\.webp"/g,
        `srcset="${article.eyecatchImagePreview.mobile}"`
      );
      htmlContent = htmlContent.replace(
        /src="images\/eyecatch-350\.webp"/g,
        `src="${article.eyecatchImagePreview.mobile}"`
      );
    }
    
    // セクション画像の置換
    if (article.sectionImagesPreview) {
      article.sectionImagesPreview.forEach((img, index) => {
        if (img) {
          const sectionNum = index + 1;
          // PC版
          htmlContent = htmlContent.replace(
            new RegExp(`srcset="images/section-${sectionNum}-800\\.webp"`, 'g'),
            `srcset="${img.pc}"`
          );
          htmlContent = htmlContent.replace(
            new RegExp(`src="images/section-${sectionNum}-800\\.webp"`, 'g'),
            `src="${img.pc}"`
          );
          // モバイル版
          htmlContent = htmlContent.replace(
            new RegExp(`srcset="images/section-${sectionNum}-350\\.webp"`, 'g'),
            `srcset="${img.mobile}"`
          );
          htmlContent = htmlContent.replace(
            new RegExp(`src="images/section-${sectionNum}-350\\.webp"`, 'g'),
            `src="${img.mobile}"`
          );
        }
      });
    }
    
    const blob = new Blob([htmlContent], {
      type: "text/html"
    });
    const url = URL.createObjectURL(blob);
    return url;
  }, [article?.htmlContent, article?.eyecatchImagePreview, article?.sectionImagesPreview]);
  if (!article) {
    return <div className="glass-card h-full flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">記事プレビュー</h3>
        <p className="text-muted-foreground text-center max-w-md">
          メインキーワードを入力して生成を開始すると、
          <br />
          ここにリアルタイムで記事が表示されます
        </p>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl bg-muted/30">
            <div className="text-2xl font-bold text-primary mb-1">10,000+</div>
            <div className="text-xs text-muted-foreground">文字数</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/30">
            <div className="text-2xl font-bold text-primary mb-1">2</div>
            <div className="text-xs text-muted-foreground">H2見出し</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/30">
            <div className="text-2xl font-bold text-primary mb-1">10-12</div>
            <div className="text-xs text-muted-foreground">H3見出し</div>
          </div>
        </div>
      </div>;
  }
  const h3Count = article.sections?.reduce((acc, section) => acc + section.h3Contents.length, 0) || 0;
  return <div className="glass-card overflow-hidden h-full flex flex-col">
      {/* Compact Header */}
      <div className="p-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
              {article.outline?.title || article.keyword}
            </h2>
            <span className="text-xs text-muted-foreground">
              {isGenerating ? "生成中..." : article.totalCharCount ? `${article.totalCharCount.toLocaleString()}文字` : "準備中"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button onClick={() => setViewMode("structure")} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "structure" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                構成
              </button>
              <button onClick={handleStartEdit} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} disabled={!article?.sections || article.sections.length === 0}>
                <Edit3 className="w-3 h-3 inline mr-1" />
                編集
              </button>
              <button onClick={() => setViewMode("preview")} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} disabled={!article?.htmlContent}>
                <Eye className="w-3 h-3 inline mr-1" />
                プレビュー
              </button>
              <button onClick={() => setViewMode("html")} className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} disabled={!article?.htmlContent}>
                <Code className="w-3 h-3 inline mr-1" />
                HTML
              </button>
            </div>

            {/* Device Mode Toggle - Only in preview mode */}
            {viewMode === "preview" && article.htmlContent && <div className="flex items-center bg-muted rounded-lg p-0.5">
                <button onClick={() => setDeviceMode("desktop")} className={`p-1.5 rounded-md transition-colors ${deviceMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="デスクトップ">
                  <Monitor className="w-4 h-4" />
                </button>
                <button onClick={() => setDeviceMode("tablet")} className={`p-1.5 rounded-md transition-colors ${deviceMode === "tablet" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="タブレット (768px)">
                  <Tablet className="w-4 h-4" />
                </button>
                <button onClick={() => setDeviceMode("mobile")} className={`p-1.5 rounded-md transition-colors ${deviceMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="スマホ (375px)">
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>}

            {viewMode === "edit" && (
              <Button 
                variant="default" 
                size="sm" 
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700" 
                onClick={handleSaveEdit}
              >
                <Save className="w-3 h-3" />
                保存
              </Button>
            )}

            {article?.htmlContent && <>
                {onRegenerateHtml && (
                  <Button variant="outline" size="sm" className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50" onClick={onRegenerateHtml}>
                    <RefreshCw className="w-3 h-3" />
                    CSS更新
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopyHtml}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "コピー済" : "コピー"}
                </Button>
                <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleDownloadHtml}>
                  <Download className="w-3 h-3" />
                  DL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs border-green-500 text-green-600 hover:bg-green-50" 
                  onClick={() => setShowDeployForm(!showDeployForm)}
                >
                  <Github className="w-3 h-3" />
                  GitHub
                </Button>
              </>}
          </div>
        </div>

        {/* GitHub Deploy Form */}
        {showDeployForm && article.htmlContent && (
          <div className="p-3 border-b border-border/50 bg-muted/30 flex-shrink-0">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">ドメイン</Label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">スラッグ</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="article-slug"
                  className="h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleDeployToGitHub}
                disabled={deploying || !domain || !slug}
              >
                {deploying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    デプロイ中...
                  </>
                ) : (
                  <>
                    <Github className="w-3 h-3" />
                    プッシュ
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              保存先: sites/{domain}/articles/{slug}.html
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Edit Mode */}
        {viewMode === "edit" && workingArticle?.sections ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  💡 記事内容を直接編集できます。編集後は「保存」→「CSS更新」でHTMLを再生成してください。
                </p>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant={visualEditMode === 'visual' ? 'default' : 'outline'}
                    onClick={() => setVisualEditMode('visual')}
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    ビジュアル
                  </Button>
                  <Button
                    size="sm"
                    variant={visualEditMode === 'html' ? 'default' : 'outline'}
                    onClick={() => setVisualEditMode('html')}
                    className="h-7 text-xs"
                  >
                    <Code className="w-3 h-3 mr-1" />
                    HTML
                  </Button>
                </div>
              </div>
            </div>

            {/* リンク切れ警告 */}
            {allBrokenLinks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-red-800">
                    ⚠️ リンク切れが {allBrokenLinks.length} 件見つかりました
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-6 text-xs border-red-300 text-red-700 hover:bg-red-100"
                    onClick={handleFixBrokenLinks}
                  >
                    自動修正
                  </Button>
                </div>
                <ul className="text-xs text-red-700 space-y-1 ml-4">
                  {allBrokenLinks.slice(0, 5).map((item, idx) => (
                    <li key={idx}>
                      H2-{item.h2Index + 1}
                      {item.h3Index !== undefined && ` > H3-${item.h3Index + 1}`}: 
                      <code className="ml-1 bg-red-100 px-1 rounded">"{item.link}"</code>
                    </li>
                  ))}
                  {allBrokenLinks.length > 5 && (
                    <li>他 {allBrokenLinks.length - 5} 件...</li>
                  )}
                </ul>
              </div>
            )}

            {workingArticle.sections.map((section, h2Index) => {
              const h2BrokenLinks = detectBrokenLinks(section.content);
              
              return (
              <div key={h2Index} className="border border-border rounded-lg p-4 bg-background">
                {/* H2 見出し編集 */}
                <div className="mb-4">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    H2見出し #{h2Index + 1}
                  </Label>
                  <Input
                    value={section.h2Title}
                    onChange={(e) => handleUpdateSection(h2Index, 'h2Title', e.target.value)}
                    className="font-semibold text-base"
                  />
                </div>

                {/* H2 本文編集 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      H2本文
                    </Label>
                    <div className="flex items-center gap-2">
                      {h2BrokenLinks.length > 0 && (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠️ リンク切れ {h2BrokenLinks.length}件
                        </span>
                      )}
                      {visualEditMode === 'visual' && editingIndex?.h2Index !== h2Index && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => setEditingIndex({ h2Index })}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          編集
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {visualEditMode === 'visual' && editingIndex?.h2Index === h2Index && editingIndex.h3Index === undefined ? (
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <VisualBlockEditor
                        htmlContent={section.content}
                        onSave={(blocks) => handleSaveVisualBlocks(h2Index, undefined, blocks)}
                        onCancel={() => setEditingIndex(null)}
                      />
                    </div>
                  ) : visualEditMode === 'html' ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => handleUpdateSection(h2Index, 'content', e.target.value)}
                      className={`min-h-[120px] font-mono text-sm ${h2BrokenLinks.length > 0 ? 'border-red-300' : ''}`}
                    />
                  ) : (
                    <div 
                      className="min-h-[120px] p-3 border rounded-lg bg-muted/10 text-sm"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}
                </div>

                {/* H3セクション編集 */}
                <div className="space-y-3 ml-4 border-l-2 border-muted pl-4">
                  {section.h3Contents.map((h3, h3Index) => {
                    const h3BrokenLinks = detectBrokenLinks(h3.content);
                    
                    return (
                    <div key={h3Index} className="border border-muted rounded-md p-3 bg-muted/20">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        H3見出し #{h2Index + 1}-{h3Index + 1}
                      </Label>
                      <Input
                        value={h3.title}
                        onChange={(e) => handleUpdateH3(h2Index, h3Index, 'title', e.target.value)}
                        className="mb-2 text-sm"
                      />
                      
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground">
                          H3本文
                        </Label>
                        <div className="flex items-center gap-2">
                          {h3BrokenLinks.length > 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              ⚠️ リンク切れ {h3BrokenLinks.length}件
                            </span>
                          )}
                          {visualEditMode === 'visual' && (editingIndex?.h2Index !== h2Index || editingIndex?.h3Index !== h3Index) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => setEditingIndex({ h2Index, h3Index })}
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              編集
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {visualEditMode === 'visual' && editingIndex?.h2Index === h2Index && editingIndex?.h3Index === h3Index ? (
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <VisualBlockEditor
                            htmlContent={h3.content}
                            onSave={(blocks) => handleSaveVisualBlocks(h2Index, h3Index, blocks)}
                            onCancel={() => setEditingIndex(null)}
                          />
                        </div>
                      ) : visualEditMode === 'html' ? (
                        <Textarea
                          value={h3.content}
                          onChange={(e) => handleUpdateH3(h2Index, h3Index, 'content', e.target.value)}
                          className={`min-h-[100px] font-mono text-xs ${h3BrokenLinks.length > 0 ? 'border-red-300' : ''}`}
                        />
                      ) : (
                        <div 
                          className="min-h-[100px] p-2 border rounded-md bg-muted/10 text-xs"
                          dangerouslySetInnerHTML={{ __html: h3.content }}
                        />
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        ) : 
        /* HTML Code View */
        viewMode === "html" && article?.htmlContent ? <pre className="bg-muted p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground h-full">
            {article.htmlContent}
          </pre> : viewMode === "preview" && previewUrl ? (/* Full HTML Preview with iframe - Responsive device frame */
      <div className="h-full flex justify-center overflow-auto bg-muted/20 rounded-xl p-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300" style={{
          width: DEVICE_WIDTHS[deviceMode],
          maxWidth: "100%",
          height: "100%"
        }}>
              <iframe src={previewUrl} className="w-full h-full border-0" title="記事プレビュー" />
            </div>
          </div>) : (/* Structure View */
      <>
            {/* Eye-catch Image Placeholder */}
            {article.eyecatchImage ? <picture>
                <source media="(max-width: 768px)" srcSet={article.eyecatchImage.mobile} type="image/webp" />
                <source media="(min-width: 769px)" srcSet={article.eyecatchImage.pc} type="image/webp" />
                <img src={article.eyecatchImage.pc} alt="アイキャッチ画像" className="w-full aspect-video object-cover rounded-xl mb-6" />
              </picture> : isGenerating ? <div className="w-full aspect-video bg-muted rounded-xl mb-6 flex items-center justify-center shimmer">
                <Image className="w-12 h-12 text-muted-foreground" />
              </div> : null}

            {/* Meta Description */}
            {article.outline?.metaDescription && <div className="mb-6 p-4 bg-muted/30 rounded-xl">
                <span className="text-xs text-muted-foreground">メタディスクリプション</span>
                <p className="text-sm text-foreground mt-1">{article.outline.metaDescription}</p>
              </div>}

            {/* Article Structure */}
            {article.sections && article.sections.length > 0 ? <div className="space-y-6">
                {article.sections.map((section, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: index * 0.1
          }} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        H2-{index + 1}
                      </span>
                      {article.sectionImages?.[index] && <span className="text-xs text-muted-foreground">📷 画像あり</span>}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {section.h2Title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {section.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                    {section.h3Contents.map((h3, h3Index) => <div key={h3Index} className="ml-4 py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">H3</span>
                          <h4 className="text-sm font-medium text-foreground">{h3.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {h3.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </p>
                        {/* Show formatting indicators */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {h3.content.includes('bubble-left') && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">💬 吹き出し</span>}
                          {h3.content.includes('marker-') && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">🖍 マーカー</span>}
                          {h3.content.includes('info-table') && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">📊 テーブル</span>}
                          {h3.content.includes('check-list') && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✅ リスト</span>}
                        </div>
                      </div>)}
                  </motion.div>)}
              </div> : article.outline?.h2Sections ? <div className="space-y-6">
                {article.outline.h2Sections.map((h2, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: index * 0.1
          }} className="border-l-2 border-primary/30 pl-4">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      H2-{index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground mt-2 mb-2">
                      {h2.title}
                    </h3>
                    {h2.h3Headings.map((h3, h3Index) => <div key={h3Index} className="ml-4 py-1 text-sm text-muted-foreground">
                        • {h3}
                      </div>)}
                  </motion.div>)}
              </div> : isGenerating ? <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="space-y-2">
                    <div className="h-6 bg-muted rounded-lg w-3/4 shimmer" />
                    <div className="h-4 bg-muted/50 rounded w-1/2 shimmer" />
                    <div className="h-4 bg-muted/50 rounded w-2/3 shimmer" />
                  </div>)}
              </div> : <p className="text-muted-foreground text-center py-8">
                記事構成を生成中...
              </p>}
          </>)}
      </div>

      {/* Compact Stats Footer */}
      <div className="p-2 border-t border-border/50 bg-muted/30 flex-shrink-0">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {article.totalCharCount?.toLocaleString() || "-"}字
            </span>
            <span className="text-muted-foreground">
              H2:{article.sections?.length || article.outline?.h2Sections?.length || 0}
            </span>
            <span className="text-muted-foreground">
              H3:{h3Count || "-"}
            </span>
            <span className="text-muted-foreground">
              📷{(article.eyecatchImage ? 1 : 0) + (article.sectionImages?.filter(Boolean).length || 0)}
            </span>
          </div>
          {viewMode === "preview" && <span className="text-muted-foreground">
              {deviceMode === "desktop" ? "PC" : deviceMode === "tablet" ? "タブレット 768px" : "スマホ 375px"}
            </span>}
        </div>
      </div>
    </div>;
};