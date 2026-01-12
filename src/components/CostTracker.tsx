import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";

// Gemini API pricing (正確な価格)
// Gemini 3 Flash Preview (gemini-3-flash-preview) - 文章生成用
// 入力: $0.075 / 1M tokens
// 出力: $0.30 / 1M tokens
// Gemini 3 Pro Preview (gemini-3-pro-preview) - 旧モデル（参考）
// 入力: $2.00 / 1M tokens (プロンプト <= 200K), $4.00 / 1M tokens (プロンプト > 200K)
// 出力: $12.00 / 1M tokens (プロンプト <= 200K), $18.00 / 1M tokens (プロンプト > 200K)
// Gemini 3 Pro Image Preview (gemini-3-pro-image-preview)
// 入力: $2.00 / 1M tokens (テキスト/画像)
// 出力: $12.00 / 1M tokens (テキストと思考), $120.00 / 1M tokens (画像)
// 為替レート: 1 USD = 150 JPY (概算)
// クレジット換算: 1 credit ≈ $0.001
const PRICING = {
  // Gemini 3 Pro Preview
  proInputLow: 2.00,      // USD per 1M tokens (prompt <= 200K)
  proInputHigh: 4.00,    // USD per 1M tokens (prompt > 200K)
  proOutputLow: 12.00,   // USD per 1M tokens (prompt <= 200K)
  proOutputHigh: 18.00,  // USD per 1M tokens (prompt > 200K)
  // Gemini 3 Pro Image Preview
  imageInput: 2.00,      // USD per 1M tokens (text/image)
  imageOutputText: 12.00, // USD per 1M tokens (text and thought)
  imageOutputImage: 120.00, // USD per 1M tokens (image)
  // 共通設定
  promptThreshold: 200_000, // トークン数の閾値
  usdToJpy: 150,
  usdToCredits: 1000, // 1 USD = 1000 credits
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
  step: string;
  modelType?: "pro" | "image"; // モデルタイプ（デフォルトは"pro"）
};

type CostTrackerProps = {
  usage: TokenUsage[];
};

const STORAGE_KEY = "article-generation-costs";

type StoredCostData = {
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionCount: number;
  lastUpdated: string;
};

const loadStoredCosts = (): StoredCostData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load costs:", e);
  }
  return { totalInputTokens: 0, totalOutputTokens: 0, sessionCount: 0, lastUpdated: new Date().toISOString() };
};

const saveCosts = (data: StoredCostData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save costs:", e);
  }
};

export const CostTracker = ({ usage }: CostTrackerProps) => {
  const [storedData, setStoredData] = useState<StoredCostData>(loadStoredCosts);

  // 現在のセッションのトークン使用量
  const sessionInputTokens = usage.reduce((sum, u) => sum + u.inputTokens, 0);
  const sessionOutputTokens = usage.reduce((sum, u) => sum + u.outputTokens, 0);

  // コスト計算関数
  const calculateCost = (usageItem: TokenUsage): { inputCost: number; outputCost: number } => {
    const modelType = usageItem.modelType || "pro";
    const promptTokens = usageItem.inputTokens;
    
    if (modelType === "image") {
      // 画像生成モデル
      const inputCost = (promptTokens / 1_000_000) * PRICING.imageInput;
      // 出力はテキストと画像の両方を含む可能性があるが、デフォルトはテキストとして計算
      // 実際の画像生成の場合は別途計算が必要
      const outputCost = (usageItem.outputTokens / 1_000_000) * PRICING.imageOutputText;
      return { inputCost, outputCost };
    } else {
      // Gemini 3 Pro Preview
      const isHighTier = promptTokens > PRICING.promptThreshold;
      const inputRate = isHighTier ? PRICING.proInputHigh : PRICING.proInputLow;
      const outputRate = isHighTier ? PRICING.proOutputHigh : PRICING.proOutputLow;
      
      const inputCost = (promptTokens / 1_000_000) * inputRate;
      const outputCost = (usageItem.outputTokens / 1_000_000) * outputRate;
      return { inputCost, outputCost };
    }
  };

  // セッションコスト計算（各使用量ごとに正確に計算）
  const sessionCosts = usage.map(calculateCost);
  const sessionInputCostUsd = sessionCosts.reduce((sum, c) => sum + c.inputCost, 0);
  const sessionOutputCostUsd = sessionCosts.reduce((sum, c) => sum + c.outputCost, 0);
  const sessionTotalCostUsd = sessionInputCostUsd + sessionOutputCostUsd;
  const sessionTotalCostJpy = sessionTotalCostUsd * PRICING.usdToJpy;
  const sessionCredits = sessionTotalCostUsd * PRICING.usdToCredits;

  // 累計コスト計算（簡易版：平均価格を使用）
  // 注意: 正確な計算には各セッションのプロンプトトークン数を記録する必要があるが、
  // 簡易的に平均価格（中間値）を使用
  const totalInputTokens = storedData.totalInputTokens + sessionInputTokens;
  const totalOutputTokens = storedData.totalOutputTokens + sessionOutputTokens;
  // プロンプトトークン数が閾値を超える可能性を考慮して中間価格を使用
  const avgInputRate = (PRICING.proInputLow + PRICING.proInputHigh) / 2;
  const avgOutputRate = (PRICING.proOutputLow + PRICING.proOutputHigh) / 2;
  const totalInputCostUsd = (totalInputTokens / 1_000_000) * avgInputRate;
  const totalOutputCostUsd = (totalOutputTokens / 1_000_000) * avgOutputRate;
  const totalCostUsd = totalInputCostUsd + totalOutputCostUsd;
  const totalCostJpy = totalCostUsd * PRICING.usdToJpy;
  const totalCredits = totalCostUsd * PRICING.usdToCredits;

  // usage が更新されたら保存
  useEffect(() => {
    if (usage.length > 0) {
      const newData: StoredCostData = {
        totalInputTokens: storedData.totalInputTokens + sessionInputTokens,
        totalOutputTokens: storedData.totalOutputTokens + sessionOutputTokens,
        sessionCount: storedData.sessionCount + 1,
        lastUpdated: new Date().toISOString(),
      };
      // セッション終了時に一度だけ保存
    }
  }, [usage.length]);

  const handleReset = () => {
    const resetData: StoredCostData = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      sessionCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    saveCosts(resetData);
    setStoredData(resetData);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">生成コスト</h3>
            <p className="text-[10px] text-muted-foreground">Gemini API トークン消費</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 w-7 p-0"
          title="累計をリセット"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* 今回のセッション */}
      <div className="space-y-2">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">今回の記事</span>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">
                ¥{sessionTotalCostJpy.toFixed(2)}
              </span>
              <span className="text-xs text-amber-600 ml-2">
                ({sessionCredits.toFixed(1)} credits)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">入力</span>
              <span className="text-foreground">{formatNumber(sessionInputTokens)} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">出力</span>
              <span className="text-foreground">{formatNumber(sessionOutputTokens)} tokens</span>
            </div>
          </div>
        </div>

        {/* 累計 */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-2">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">累計コスト</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold text-foreground">
                ¥{totalCostJpy.toFixed(2)}
              </span>
              <span className="text-xs text-amber-600 ml-2">
                ({totalCredits.toFixed(1)} credits)
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              ({storedData.sessionCount}回生成)
            </span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            合計 {formatNumber(totalInputTokens + totalOutputTokens)} tokens
          </div>
        </div>

        {/* 内訳 */}
        {usage.length > 0 && (
          <div className="border-t border-border pt-2 mt-2">
            <span className="text-[10px] text-muted-foreground mb-1 block">内訳</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {usage.map((u, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground truncate max-w-[120px]">{u.step}</span>
                  <span className="text-foreground">
                    {formatNumber(u.inputTokens + u.outputTokens)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// トークン使用量を追加するユーティリティ
export const createTokenUsage = (
  step: string,
  inputTokens: number,
  outputTokens: number,
  modelType?: "pro" | "image"
): TokenUsage => ({
  step,
  inputTokens,
  outputTokens,
  timestamp: new Date(),
  modelType,
});
