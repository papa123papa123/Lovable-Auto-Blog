import { useState, useRef } from "react";
import { Search, Sparkles, Loader2, ShoppingBag, FileText, Link2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { generateSlug } from "@/lib/api/github-deploy";
import { useToast } from "@/hooks/use-toast";

type HtmlProductInfo = {
  asin: string;
  title?: string;
  imageUrl?: string;
  price?: string;
};

type KeywordInputProps = {
  onSubmit: (keyword: string, productKeyword: string, slug: string, htmlProducts?: HtmlProductInfo[]) => void;
  isLoading: boolean;
};

export const KeywordInput = ({ onSubmit, isLoading }: KeywordInputProps) => {
  const [keyword, setKeyword] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [slug, setSlug] = useState("");
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [selectedHtmlFile, setSelectedHtmlFile] = useState<File | null>(null);
  const [htmlProducts, setHtmlProducts] = useState<HtmlProductInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html')) {
      alert('HTMLファイルを選択してください');
      return;
    }

    try {
      const text = await file.text();
      
      // DOMParserでHTMLを解析
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // data-asin属性を持つ商品要素を取得
      const productElements = doc.querySelectorAll('[data-asin]');
      
      const products: HtmlProductInfo[] = [];
      const seenAsins = new Set<string>();
      
      productElements.forEach((element) => {
        const asin = element.getAttribute('data-asin');
        
        // ASINが10文字で、まだ処理していないものだけ
        if (!asin || asin.length !== 10 || seenAsins.has(asin)) {
          return;
        }
        
        // タイトル抽出（h2要素から）
        const h2Element = element.querySelector('h2');
        const title = h2Element?.textContent?.trim();
        
        // タイトルがない商品はスキップ
        if (!title) {
          return;
        }
        
        // 画像URL抽出（s-imageクラスを持つimg要素から）
        const imgElement = element.querySelector('img.s-image, img[class*="s-image"]');
        const imageUrl = imgElement?.getAttribute('src') || '';
        
        // 価格抽出（a-price-wholeクラスから）
        const priceElement = element.querySelector('.a-price-whole');
        const priceText = priceElement?.textContent?.trim() || '';
        // カンマとドットを削除して数字のみに
        const price = priceText.replace(/,/g, '').replace(/\./g, '');
        
        seenAsins.add(asin);
        products.push({
          asin,
          title: title.substring(0, 200),
          imageUrl,
          price
        });
      });
      
      setSelectedHtmlFile(file);
      setHtmlProducts(products);
      
      console.log(`✅ ${products.length}件の商品情報を抽出しました`);
      if (products.length > 0) {
        console.log('サンプル:', products[0]);
      }
    } catch (error) {
      console.error('HTMLファイルの読み込みエラー:', error);
      alert('HTMLファイルの読み込みに失敗しました');
    }
  };

  const handleGenerateSlug = async () => {
    if (!keyword.trim()) {
      toast({
        title: "キーワードを入力してください",
        variant: "destructive",
      });
      return;
    }

    setGeneratingSlug(true);
    try {
      const generatedSlug = await generateSlug(keyword.trim());
      setSlug(generatedSlug);
      toast({
        title: "スラッグを生成しました",
        description: generatedSlug,
      });
    } catch (error) {
      console.error("Slug generation failed:", error);
      toast({
        title: "スラッグ生成エラー",
        description: error instanceof Error ? error.message : "スラッグの生成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setGeneratingSlug(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() && productKeyword.trim() && slug.trim() && !isLoading) {
      onSubmit(keyword.trim(), productKeyword.trim(), slug.trim(), htmlProducts.length > 0 ? htmlProducts : undefined);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Search className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">メインキーワード</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: React hooks ベストプラクティス"
            disabled={isLoading}
            className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
          />
        </div>

        {/* スラッグ入力欄（必須） */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <label className="text-sm font-medium text-foreground">
              記事スラッグ（URL） <span className="text-destructive">*</span>
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="例: ipad-case-cute"
              disabled={isLoading || generatingSlug}
              required
              className="flex-1 h-10 px-4 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateSlug}
              disabled={!keyword.trim() || isLoading || generatingSlug}
              className="shrink-0"
            >
              {generatingSlug ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            URL: comic-review-navi.com/articles/<span className="font-mono text-primary">{slug || "slug"}</span>
          </p>
        </div>

        {/* 商品検索キーワード入力欄（必須） */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <label className="text-sm font-medium text-foreground">
              商品検索キーワード <span className="text-destructive">*</span>
            </label>
          </div>
          <input
            type="text"
            value={productKeyword}
            onChange={(e) => setProductKeyword(e.target.value)}
            placeholder="例: エアコン"
            disabled={isLoading}
            required
            className="w-full h-10 px-4 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            商品リンクの検索に使用されます
          </p>
          
          {/* HTML選択ボタン */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <label className="text-sm font-medium text-foreground">
                HTML選択（Amazon商品一覧）
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".html"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                {selectedHtmlFile ? selectedHtmlFile.name : "HTMLファイルを選択"}
              </Button>
              {selectedHtmlFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedHtmlFile(null);
                    setHtmlProducts([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isLoading}
                  className="text-xs"
                >
                  クリア
                </Button>
              )}
            </div>
            {htmlProducts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {htmlProducts.length}件の商品情報を抽出しました
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={!keyword.trim() || !productKeyword.trim() || !slug.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              全自動生成
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        キーワード調査 → 構成作成 → 記事執筆を全自動で実行します
      </p>
    </div>
  );
};
