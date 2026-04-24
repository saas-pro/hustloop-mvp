"use client";
import React, { useEffect, useRef, useState } from "react";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  disabled?: boolean;
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Type your message...",
  height = "180px",
  disabled = false,
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const hasInitRef = useRef(false);

  const [isDarkTheme, setisDarkTheme] = useState(false);

  useEffect(() => {
    const getTheme = localStorage.getItem("theme");
    if (getTheme === "light" || getTheme === "blue" || getTheme === "green" || getTheme === "purple" || !getTheme) {
      setisDarkTheme(false)
    } else {
      setisDarkTheme(true)
    }
  }, [isDarkTheme])

  useEffect(() => {
    async function init() {
      if (hasInitRef.current) return;
      hasInitRef.current = true;

      if (!editorRef.current) return;
      const Quill = (await import("quill")).default;

      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }],
            ["link", "image"],
            ["blockquote", "code-block"],
            [{ align: [] }],
            ["clean"],
          ],
          keyboard: {
            bindings: {
              handleBackspace: {
                key: 'backspace',
                collapsed: false,
                handler: function (range: any) {
                  quillRef.current?.deleteText(range.index, range.length);
                  return false;
                }
              }
            },
          },
        }
      });

      quillRef.current.on("text-change", () => {
        const html = quillRef.current.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });

      if (value) {
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
      }
    }

    init();
  }, [onChange, placeholder, value]);

  useEffect(() => {
    if (!quillRef.current) return;

    const editorHTML = quillRef.current.root.innerHTML;
    if (editorHTML !== value) {
      quillRef.current.clipboard.dangerouslyPasteHTML(value || "");
    }
  }, [value]);

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
    }
  }, [disabled]);

  return (
    <div className="quill-wrapper flex flex-col w-full rounded-md shadow-sm">
      <div className={isDarkTheme ? "quill-dark" : "quill-light"}>
        <div
          ref={editorRef}
          className="rounded-b-md p-2 h-full"
          style={{ minHeight: height }}
        />
      </div>
    </div>
  );
}
