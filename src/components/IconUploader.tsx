// -*- coding: utf-8 -*-
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, X, Image, Loader2, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useToast } from "@/hooks/use-toast";

type UploadedIcon = {
  name: string;
  url: string;
  size: number;
};

type UploadProgress = {
  total: number;
  completed: number;
  failed: number;
  current: string;
};

export const IconUploader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [icons, setIcons] = useState<UploadedIcon[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const fetchIcons = useCallback(async () => {
    try {
      const response = await fetch("/api/icons/list");
      if (!response.ok) {
        console.error("Failed to fetch icons:", response.status);
        return;
      }
      
      const result = await response.json() as {
        success: boolean;
        data?: Array<{ name: string; url: string; size: number }>;
        error?: string;
      };
      
      if (!result.success || !result.data) {
        console.error("Failed to fetch icons:", result.error);
        return;
      }

      const iconList: UploadedIcon[] = result.data
        .filter((file) => file.name && !file.name.startsWith("."))
        .map((file) => ({
          name: file.name,
          url: file.url,
          size: file.size || 0,
        }));

      setIcons(iconList);
    } catch (error) {
      console.error("Failed to fetch icons:", error);
    }
  }, []);

  const handleOpen = async () => {
    setIsOpen(true);
    await fetchIcons();
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      const isValidType = ["image/webp", "image/png", "image/jpeg", "image/svg+xml"].includes(file.type);
      const isValidSize = file.size <= 5242880; // 5MB
      return isValidType && isValidSize;
    });

    const invalidCount = fileArray.length - validFiles.length;
    if (invalidCount > 0) {
      console.log(`Skipped ${invalidCount} invalid files (not image or over 5MB)`);
    }

    if (validFiles.length === 0) {
      toast({
        title: "アップロードエラー",
        description: `有効なファイルがありません（WebP/PNG/JPEG/SVG、5MB以下）。${invalidCount}件スキップ`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProgress({
      total: validFiles.length,
      completed: 0,
      failed: 0,
      current: "",
    });

    let completed = 0;
    let failed = 0;

    // バッチ処理（10件ずつ並列アップロード）
    const batchSize = 10;
    
    for (let i = 0; i < validFiles.length; i += batchSize) {
      const batch = validFiles.slice(i, i + batchSize);
      
      const uploadPromises = batch.map(async (file) => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          
          const response = await fetch("/api/icons/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }
          
          const result = await response.json() as { success: boolean; error?: string };
          return { success: result.success, fileName: file.name };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          return { success: false, fileName: file.name, error };
        }
      });

      const results = await Promise.all(uploadPromises);

      results.forEach((result) => {
        if (result.success) {
          completed++;
        } else {
          failed++;
        }
      });

      setProgress((prev) =>
        prev ? { ...prev, completed, failed, current: `${completed}/${validFiles.length}` } : null
      );
    }

    setIsUploading(false);
    setProgress(null);

    toast({
      title: "アップロード完了",
      description: `${completed}件成功${failed > 0 ? `、${failed}件失敗` : ""}${invalidCount > 0 ? `、${invalidCount}件スキップ` : ""}`,
    });

    await fetchIcons();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const response = await fetch("/api/icons/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: [name] }),
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      
      const result = await response.json() as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || "Delete failed");
      }
      
      setIcons((prev) => prev.filter((icon) => icon.name !== name));
      toast({ title: "削除完了" });
    } catch (error) {
      toast({
        title: "削除エラー",
        description: error instanceof Error ? error.message : "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <FolderOpen className="w-4 h-4" />
        アイコン管理
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Image className="w-4 h-4" />
          アイコン管理 ({icons.length}件)
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label="閉じる">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          multiple
          accept=".webp,.png,.jpg,.jpeg,.svg"
          onChange={handleFileSelect}
          className="hidden"
          id="icon-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="icon-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            ドラッグ＆ドロップ または クリックで選択
          </span>
          <span className="text-xs text-muted-foreground">
            WebP/PNG/JPEG/SVG（5MB以下）
          </span>
        </label>
      </div>

      {/* Upload Progress */}
      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[200px]">
              {progress.current}
            </span>
            <span className="text-foreground">
              {progress.completed + progress.failed}/{progress.total}
            </span>
          </div>
          <Progress
            value={((progress.completed + progress.failed) / progress.total) * 100}
          />
        </div>
      )}

      {/* Icon Grid */}
      {icons.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {icons.map((icon) => (
              <div
                key={icon.name}
                className="relative group aspect-square bg-muted rounded-lg overflow-hidden"
                title={icon.name}
              >
                <img
                  src={icon.url}
                  alt={icon.name}
                  className="w-full h-full object-contain p-1"
                />
                <button
                  onClick={() => handleDelete(icon.name)}
                  className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {icons.length === 0 && !isUploading && (
        <p className="text-xs text-muted-foreground text-center py-4">
          アイコンがまだありません
        </p>
      )}
    </motion.div>
  );
};
