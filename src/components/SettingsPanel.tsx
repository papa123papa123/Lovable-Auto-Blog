// -*- coding: utf-8 -*-
import { motion } from "framer-motion";
import { X, Github, Cloud, FolderOpen, Save, Plus, Trash2, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

type DomainConfig = {
  id: string;
  domainName: string;
  folderPath: string;
};

export type CloudflareSettings = {
  githubRepo: string;
  cloudflareProjectName: string;
  domains: DomainConfig[];
  activeDomainId: string;
};

const DEFAULT_SETTINGS: CloudflareSettings = {
  githubRepo: "https://github.com/papa123papa123/Lovable-Auto-Blog.git",
  cloudflareProjectName: "lovable-auto-blog",
  domains: [
    { id: "1", domainName: "comic-review-navi.com", folderPath: "sites/comic-review-navi.com" }
  ],
  activeDomainId: "1",
};

const STORAGE_KEY = "cloudflare-settings";

export const loadSettings = (): CloudflareSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: CloudflareSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
};

export const getActiveDomain = (): DomainConfig | undefined => {
  const settings = loadSettings();
  return settings.domains.find(d => d.id === settings.activeDomainId);
};

type SettingsPanelProps = {
  onClose: () => void;
  onSettingsSaved?: (settings: CloudflareSettings) => void;
};

export const SettingsPanel = ({ onClose, onSettingsSaved }: SettingsPanelProps) => {
  const [settings, setSettings] = useState<CloudflareSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    onSettingsSaved?.(settings);
    onClose();
  };

  const addDomain = () => {
    const newId = Date.now().toString();
    const newDomain: DomainConfig = {
      id: newId,
      domainName: "",
      folderPath: "sites/",
    };
    setSettings(prev => ({
      ...prev,
      domains: [...prev.domains, newDomain],
    }));
  };

  const removeDomain = (id: string) => {
    if (settings.domains.length <= 1) return;
    setSettings(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d.id !== id),
      activeDomainId: prev.activeDomainId === id ? prev.domains[0].id : prev.activeDomainId,
    }));
  };

  const updateDomain = (id: string, field: keyof DomainConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      domains: prev.domains.map(d => {
        if (d.id !== id) return d;
        if (field === "domainName") {
          // ドメイン名変更時にfolderPathも自動更新
          return { ...d, domainName: value, folderPath: `sites/${value}` };
        }
        return { ...d, [field]: value };
      }),
    }));
  };

  const setActiveDomain = (id: string) => {
    setSettings(prev => ({ ...prev, activeDomainId: id }));
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">Cloudflare設定</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-6">
            {/* GitHub Settings */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Github className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">GitHub</h3>
                  <p className="text-xs text-muted-foreground">リポジトリ設定</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    リポジトリURL
                  </label>
                  <input
                    type="text"
                    value={settings.githubRepo}
                    onChange={(e) => setSettings(prev => ({ ...prev, githubRepo: e.target.value }))}
                    placeholder="https://github.com/user/repo.git"
                    className="w-full h-10 px-3 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Cloudflare Settings */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Cloudflare Pages</h3>
                  <p className="text-xs text-muted-foreground">デプロイ設定</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    プロジェクト名
                  </label>
                  <input
                    type="text"
                    value={settings.cloudflareProjectName}
                    onChange={(e) => setSettings(prev => ({ ...prev, cloudflareProjectName: e.target.value }))}
                    placeholder="lovable-auto-blog"
                    className="w-full h-10 px-3 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Multi-Domain Settings */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Globe className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">ドメイン管理</h3>
                    <p className="text-xs text-muted-foreground">sites/(ドメイン)/index.html</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addDomain}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  追加
                </Button>
              </div>

              <div className="space-y-3">
                {settings.domains.map((domain, index) => (
                  <div
                    key={domain.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      domain.id === settings.activeDomainId
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">ドメイン {index + 1}</span>
                      <div className="flex items-center gap-2">
                        {domain.id !== settings.activeDomainId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveDomain(domain.id)}
                            className="h-7 text-xs"
                          >
                            選択
                          </Button>
                        )}
                        {domain.id === settings.activeDomainId && (
                          <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/20 rounded">
                            アクティブ
                          </span>
                        )}
                        {settings.domains.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDomain(domain.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          ドメイン名
                        </label>
                        <input
                          type="text"
                          value={domain.domainName}
                          onChange={(e) => updateDomain(domain.id, "domainName", e.target.value)}
                          placeholder="example.com"
                          className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          保存先パス
                        </label>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <input
                            type="text"
                            value={domain.folderPath}
                            onChange={(e) => updateDomain(domain.id, "folderPath", e.target.value)}
                            placeholder="sites/example.com"
                            className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Info Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-foreground mb-2">
                <strong>📡 API設定:</strong>
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                バックエンドAPIはCloudflare Pages Functionsで動作します。
                環境変数はCloudflare Pagesダッシュボードで設定してください:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>GEMINI_API_KEY - Gemini API</li>
                <li>GITHUB_TOKEN - GitHubデプロイ用</li>
                <li>FIRECRAWL_API_KEY - Amazon検索用</li>
                <li>RAKUTEN_APP_ID - 楽天API</li>
                <li>RAKUTEN_AFFILIATE_ID - 楽天アフィリエイト</li>
                <li>AMAZON_ASSOCIATE_ID - Amazonアフィリエイト</li>
              </ul>
            </div>

            {/* Folder Structure Info */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-foreground mb-2">
                <strong>フォルダ構成:</strong>
              </p>
              <pre className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg overflow-x-auto">
{`${settings.githubRepo.replace('.git', '').split('/').pop() || 'repo'}/
├── sites/
│   ├── ${settings.domains[0]?.domainName || 'domain1.com'}/
│   │   └── index.html
│   └── ${settings.domains[1]?.domainName || 'domain2.com'}/
│       └── index.html
└── ...`}
              </pre>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              variant="hero"
              size="lg"
              className="w-full"
            >
              <Save className="w-5 h-5" />
              設定を保存
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
