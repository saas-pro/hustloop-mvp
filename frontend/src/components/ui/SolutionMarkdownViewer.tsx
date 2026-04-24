import React from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

interface MarkdownViewerProps {
  content: string;
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

const defaultRender =
  md.renderer.rules.image ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex("src");
  const altIndex = token.attrIndex("alt");

  if (srcIndex >= 0) {
    const src = token.attrs?.[srcIndex][1];
    const alt = altIndex >= 0 ? token.attrs?.[altIndex][1] : "Image";
    return `
      <div style="text-align:center; margin:1rem 0;">
        <img 
          src="${src}" 
          alt="${alt}"
          style="
            max-width:100%;
            height:auto;
            border-radius:8px;
            box-shadow:0 2px 6px rgba(0,0,0,0.15);
            display:inline-block;
          "
        />
      </div>
    `;
  }

  return defaultRender(tokens, idx, options, env, self);
};

export const SolutionMarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const renderedHTML = md.render(content || "");
  const cleanHTML = DOMPurify.sanitize(renderedHTML);

  return (
    <div
      className="prose-sm max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:underline prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4"
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
};
