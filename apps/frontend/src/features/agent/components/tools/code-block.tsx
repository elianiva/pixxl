import { memo } from "react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

const LANGUAGE_CLASSES: Record<string, string> = {
  // Syntax highlighting via tailwind classes
  diff: "text-red-400",
  javascript: "text-yellow-300",
  jsx: "text-yellow-300",
  typescript: "text-blue-400",
  tsx: "text-blue-400",
  json: "text-green-400",
  css: "text-pink-400",
  scss: "text-pink-400",
  html: "text-orange-400",
  python: "text-green-300",
  bash: "text-green-400",
  shell: "text-green-400",
  yaml: "text-purple-400",
  markdown: "text-gray-300",
  rust: "text-orange-300",
  go: "text-cyan-400",
  dockerfile: "text-blue-300",
};

function highlightLine(line: string, language: string): React.ReactNode {
  // Simple token highlighting
  let highlighted = line;

  // Strings
  highlighted = highlighted.replace(
    /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="text-green-400">$&</span>',
  );

  // Comments
  if (language === "bash" || language === "shell") {
    highlighted = highlighted.replace(/(#.*)$/, '<span class="text-gray-500">$1</span>');
  } else if (
    language === "typescript" ||
    language === "tsx" ||
    language === "javascript" ||
    language === "jsx"
  ) {
    highlighted = highlighted.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500">$1</span>',
    );
  }

  // Keywords
  const keywords =
    language === "typescript" ||
    language === "tsx" ||
    language === "javascript" ||
    language === "jsx"
      ? /\b(const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|new|import|export|from|async|await|try|catch|throw|default|switch|case|break|continue|typeof|instanceof|public|private|protected|static|readonly|abstract|as|is|in|of|yield|delete|void|null|undefined|true|false)\b/g
      : language === "bash" || language === "shell"
        ? /\b(if|then|else|fi|for|do|done|while|case|esac|function|return|exit|export|source|alias|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|chmod|chown|echo|printf|read|test|true|false)\b/g
        : language === "python"
          ? /\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|async|await|yield|lambda|pass|break|continue|raise|assert|global|nonlocal|True|False|None|and|or|not|in|is)\b/g
          : null;

  if (keywords) {
    highlighted = highlighted.replace(keywords, '<span class="text-purple-400">$1</span>');
  }

  // Numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-400">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

export const CodeBlock = memo(function CodeBlock({
  code,
  language = "text",
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const lines = code.split("\n");
  const langClass = LANGUAGE_CLASSES[language] ?? "text-gray-300";

  return (
    <div className={cn("overflow-hidden", className)}>
      <pre className={cn("p-3 text-xs leading-relaxed overflow-x-auto bg-[#1a1a1a]", langClass)}>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {showLineNumbers && (
              <span className="select-none pr-4 text-right text-white/30 w-8 flex-shrink-0">
                {i + 1}
              </span>
            )}
            <span className="flex-1">
              {language === "diff" ? (
                <span
                  className={cn(
                    line.startsWith("+") && "text-green-400 bg-green-400/10",
                    line.startsWith("-") && "text-red-400 bg-red-400/10",
                    line.startsWith("@@") && "text-blue-400",
                  )}
                >
                  {line}
                </span>
              ) : (
                highlightLine(line, language)
              )}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
});
