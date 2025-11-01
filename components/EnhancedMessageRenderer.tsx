import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface EnhancedMessageRendererProps {
  content: string;
  className?: string;
}

// 代码块组件（带复制功能）
function CodeBlock({ 
  code, 
  language 
}: { 
  code: string; 
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 border border-gray-800 border-b-0 rounded-t-lg">
        <span className="text-xs text-gray-400 uppercase font-mono">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              复制
            </>
          )}
        </button>
      </div>
      <pre className="m-0 rounded-b-lg border border-gray-800 border-t-0 overflow-x-auto bg-zinc-900">
        <code className="block p-4 text-sm text-gray-300 font-mono">
          {code}
        </code>
      </pre>
    </div>
  );
}

export function EnhancedMessageRenderer({ 
  content, 
  className = '' 
}: EnhancedMessageRendererProps) {
  return (
    <div className={`enhanced-markdown-content text-left ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块处理
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <CodeBlock 
                  code={codeContent} 
                  language={match[1]} 
                />
              );
            }
            
            // 行内代码
            return (
              <code 
                className="px-1.5 py-0.5 bg-gray-800 text-pink-400 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },

          // 标题
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 mt-8 text-white border-b border-gray-800 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold mb-4 mt-6 text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold mb-3 mt-5 text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-bold mb-2 mt-4 text-white">
              {children}
            </h4>
          ),

          // 段落
          p: ({ children }) => (
            <p className="text-gray-300 leading-relaxed mb-4 text-left">
              {children}
            </p>
          ),

          // 链接
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),

          // 列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1.5 text-gray-300 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1.5 text-gray-300 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300 leading-relaxed">
              {children}
            </li>
          ),

          // 表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-gray-800 border border-gray-800 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-900">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-800 bg-zinc-900">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-800/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-400">
              {children}
            </td>
          ),

          // 引用块
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-purple-950/20 rounded-r-lg">
              <div className="text-gray-300 italic">
                {children}
              </div>
            </blockquote>
          ),

          // 分隔线
          hr: () => (
            <hr className="my-8 border-gray-800" />
          ),

          // 强调
          strong: ({ children }) => (
            <strong className="font-bold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-200">
              {children}
            </em>
          ),

          // 删除线
          del: ({ children }) => (
            <del className="line-through text-gray-500">
              {children}
            </del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
