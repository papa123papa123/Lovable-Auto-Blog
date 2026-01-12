import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Trash2, Clock, Check, ExternalLink, ChevronDown, ChevronUp, HardDrive } from "lucide-react";
import { Button } from "./ui/button";
import { loadSavedArticles, deleteArticle, getStorageUsage, type SavedArticle } from "@/lib/article-storage";
import { useToast } from "@/hooks/use-toast";

type SavedArticlesListProps = {
  onSelectArticle: (article: SavedArticle) => void;
  refreshTrigger?: number;
};

export const SavedArticlesList = ({ onSelectArticle, refreshTrigger }: SavedArticlesListProps) => {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 });
  const { toast } = useToast();

  useEffect(() => {
    setArticles(loadSavedArticles());
    setStorageUsage(getStorageUsage());
  }, [refreshTrigger]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteArticle(id);
    setArticles(loadSavedArticles());
    setStorageUsage(getStorageUsage());
    toast({
      title: "記事を削除しました",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (articles.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">保存済み記事</h3>
            <p className="text-[10px] text-muted-foreground">{articles.length}件のローカル保存</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* ストレージ使用量 */}
            <div className="mt-3 mb-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <HardDrive className="w-3 h-3" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span>ストレージ使用量</span>
                  <span>{formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 記事一覧 */}
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {articles.map((article) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                  onClick={() => onSelectArticle(article)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-foreground truncate">
                          {article.keyword}
                        </span>
                        {article.deployed && (
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(article.savedAt)}</span>
                        {article.totalCharCount && (
                          <span className="text-primary">{article.totalCharCount.toLocaleString()}文字</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(article.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
