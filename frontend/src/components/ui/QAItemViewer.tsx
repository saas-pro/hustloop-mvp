import React from "react";
import DOMPurify from "dompurify";

interface QAItemViewerProps {
  html: string;
}

const QAItemViewer: React.FC<QAItemViewerProps> = ({ html }) => {
  return (
    <div
      className="text-sm ml-2 ql-editor !py-1 w-full break-words"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
};

export default QAItemViewer;
