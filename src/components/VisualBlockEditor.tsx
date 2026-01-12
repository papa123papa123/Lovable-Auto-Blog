import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Link as LinkIcon, Type, List, Trash2, Plus } from "lucide-react";

// ブロックの種類
export type BlockType = "text" | "link" | "list" | "heading";

export type ContentBlock = {
  id: string;
  type: BlockType;
  content: string;
  // リンクの場合
  url?: string;
  linkText?: string;
  // リストの場合
  items?: string[];
};

type VisualBlockEditorProps = {
  htmlContent: string;
  onSave: (blocks: ContentBlock[]) => void;
  onCancel: () => void;
};

// HTMLをブロックに変換
const parseHtmlToBlocks = (html: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let blockId = 0;
  
  const processNode = (node: Node, parentElement?: Element) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && text.length > 0 && !parentElement) {
        blocks.push({
          id: `block-${blockId++}`,
          type: "text",
          content: text,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // <p>タグ内のリンクとテキストを抽出
      if (element.tagName === 'P') {
        const childNodes = Array.from(element.childNodes);
        
        childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text && text.length > 0) {
              blocks.push({
                id: `block-${blockId++}`,
                type: "text",
                content: text,
              });
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as Element;
            
            if (childEl.tagName === 'A') {
              const url = childEl.getAttribute('href') || '';
              const linkText = childEl.textContent || '';
              blocks.push({
                id: `block-${blockId++}`,
                type: "link",
                content: linkText,
                url,
                linkText,
              });
            } else {
              // その他のタグは再帰処理
              processNode(child, element);
            }
          }
        });
      } else if (element.tagName === 'A') {
        const url = element.getAttribute('href') || '';
        const linkText = element.textContent || '';
        blocks.push({
          id: `block-${blockId++}`,
          type: "link",
          content: linkText,
          url,
          linkText,
        });
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
        blocks.push({
          id: `block-${blockId++}`,
          type: "list",
          content: items.join('\n'),
          items,
        });
      } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
        blocks.push({
          id: `block-${blockId++}`,
          type: "heading",
          content: element.textContent || '',
        });
      } else {
        // 子要素を再帰的に処理
        Array.from(element.childNodes).forEach(child => processNode(child, element));
      }
    }
  };
  
  Array.from(doc.body.childNodes).forEach(node => processNode(node));
  
  // 空のブロックを除外
  return blocks.filter(block => block.content.trim().length > 0);
};

// ブロックをHTMLに変換
const blocksToHtml = (blocks: ContentBlock[]): string => {
  return blocks.map(block => {
    switch (block.type) {
      case "text":
        return `<p>${block.content}</p>`;
      case "link":
        return `<a href="${block.url || '#'}">${block.linkText || block.content}</a>`;
      case "list":
        return `<ul>${(block.items || []).map(item => `<li>${item}</li>`).join('')}</ul>`;
      case "heading":
        return `<h3>${block.content}</h3>`;
      default:
        return '';
    }
  }).join('\n');
};

export const VisualBlockEditor = ({ htmlContent, onSave, onCancel }: VisualBlockEditorProps) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  useEffect(() => {
    setBlocks(parseHtmlToBlocks(htmlContent));
  }, [htmlContent]);

  const handleUpdateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
  };

  const handleAddBlock = (type: BlockType, afterId?: string) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
    };
    
    if (type === 'link') {
      newBlock.url = '';
      newBlock.linkText = '';
    } else if (type === 'list') {
      newBlock.items = [''];
    }

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
  };

  const handleSave = () => {
    onSave(blocks);
  };

  const handleFixAllLinks = () => {
    let fixCount = 0;
    const fixedBlocks = blocks.map(block => {
      if (block.type === 'link') {
        if (!block.url || block.url === '' || block.url === '#' || block.url === 'undefined') {
          fixCount++;
          return { ...block, url: '#' };
        }
      }
      return block;
    });
    
    setBlocks(fixedBlocks);
    
    if (fixCount > 0) {
      alert(`${fixCount} 件のリンク切れを修正しました`);
    }
  };

  const brokenLinksCount = blocks.filter(b => 
    b.type === 'link' && (!b.url || b.url === '' || b.url === '#' || b.url === 'undefined')
  ).length;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pb-3 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">ビジュアル編集モード</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" />
              保存
            </Button>
          </div>
        </div>
        
        {brokenLinksCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2 flex items-center justify-between">
            <span className="text-xs text-red-700">
              ⚠️ リンク切れが {brokenLinksCount} 件あります
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs border-red-300 text-red-700 hover:bg-red-100"
              onClick={handleFixAllLinks}
            >
              自動修正
            </Button>
          </div>
        )}
        
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => handleAddBlock('text')} className="h-7 text-xs">
            <Type className="w-3 h-3 mr-1" />
            テキスト
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAddBlock('link')} className="h-7 text-xs">
            <LinkIcon className="w-3 h-3 mr-1" />
            リンク
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAddBlock('list')} className="h-7 text-xs">
            <List className="w-3 h-3 mr-1" />
            リスト
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.id} className="group relative border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 bg-background"
                onClick={() => handleDeleteBlock(block.id)}
                title="削除"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 bg-background"
                onClick={() => handleAddBlock('text', block.id)}
                title="後に追加"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {block.type === 'text' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">テキスト</Label>
                <Textarea
                  value={block.content}
                  onChange={(e) => handleUpdateBlock(block.id, { content: e.target.value })}
                  className="min-h-[60px] text-sm"
                  placeholder="テキストを入力..."
                />
              </div>
            )}

            {block.type === 'link' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    リンク先URL
                  </Label>
                  <Input
                    value={block.url || ''}
                    onChange={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
                    className="text-sm font-mono"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    表示テキスト
                  </Label>
                  <Input
                    value={block.linkText || block.content}
                    onChange={(e) => handleUpdateBlock(block.id, { 
                      linkText: e.target.value, 
                      content: e.target.value 
                    })}
                    className="text-sm"
                    placeholder="リンクの表示テキスト"
                  />
                </div>
                {(block.url === '' || block.url === '#' || block.url === 'undefined' || !block.url) && (
                  <div className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
                    ⚠️ リンク先が設定されていません
                  </div>
                )}
                {block.url && block.linkText && (
                  <div className="mt-2 p-2 bg-muted/30 rounded border">
                    <Label className="text-xs text-muted-foreground mb-1 block">プレビュー</Label>
                    <a 
                      href={block.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {block.linkText}
                    </a>
                  </div>
                )}
              </div>
            )}

            {block.type === 'list' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">リスト（1行1項目）</Label>
                <Textarea
                  value={(block.items || []).join('\n')}
                  onChange={(e) => {
                    const items = e.target.value.split('\n');
                    handleUpdateBlock(block.id, { items, content: items.join('\n') });
                  }}
                  className="min-h-[80px] text-sm"
                  placeholder="項目1&#10;項目2&#10;項目3"
                />
              </div>
            )}

            {block.type === 'heading' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">見出し</Label>
                <Input
                  value={block.content}
                  onChange={(e) => handleUpdateBlock(block.id, { content: e.target.value })}
                  className="text-base font-semibold"
                  placeholder="見出しテキスト"
                />
              </div>
            )}
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm mb-3">ブロックがありません</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={() => handleAddBlock('text')}>
                <Type className="w-3 h-3 mr-1" />
                テキスト追加
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAddBlock('link')}>
                <LinkIcon className="w-3 h-3 mr-1" />
                リンク追加
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { parseHtmlToBlocks, blocksToHtml };
