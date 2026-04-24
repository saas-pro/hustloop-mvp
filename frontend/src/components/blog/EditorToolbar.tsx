"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
    Bold, Italic, List, ListOrdered, Quote, Code, Heading1, Heading2,
    Undo, Redo, Link as LinkIcon, Image as ImageIcon, Highlighter,
    AlignLeft, AlignCenter, AlignRight, ListTodo, Pilcrow
} from "lucide-react";

interface EditorToolbarProps {
    editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
    if (!editor) return null;

    const addImage = () => {
        const url = window.prompt('URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const isParagraph = editor.isActive("paragraph") ||
        (!editor.isActive("heading") &&
            !editor.isActive("bulletList") &&
            !editor.isActive("orderedList") &&
            !editor.isActive("taskList") &&
            !editor.isActive("blockquote") &&
            !editor.isActive("codeBlock"));

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive("bold") ? "bg-accent text-accent-foreground" : ""}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive("italic") ? "bg-accent text-accent-foreground" : ""}
            >
                <Italic className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive("heading", { level: 1 }) ? "bg-accent text-accent-foreground" : ""}
            >
                <Heading1 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive("heading", { level: 2 }) ? "bg-accent text-accent-foreground" : ""}
            >
                <Heading2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive("bulletList") ? "bg-accent text-accent-foreground" : ""}
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive("orderedList") ? "bg-accent text-accent-foreground" : ""}
            >
                <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={editor.isActive("taskList") ? "bg-accent text-accent-foreground" : ""}
            >
                <ListTodo className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive("blockquote") ? "bg-accent text-accent-foreground" : ""}
            >
                <Quote className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive("codeBlock") ? "bg-accent text-accent-foreground" : ""}
            >
                <Code className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={setLink}
                className={editor.isActive("link") ? "bg-accent text-accent-foreground" : ""}
            >
                <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={addImage}
            >
                <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={editor.isActive("highlight") ? "bg-accent text-accent-foreground" : ""}
            >
                <Highlighter className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? "bg-accent text-accent-foreground" : ""}
            >
                <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? "bg-accent text-accent-foreground" : ""}
            >
                <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? "bg-accent text-accent-foreground" : ""}
            >
                <AlignRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1 my-auto ml-auto" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
            >
                <Undo className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
            >
                <Redo className="h-4 w-4" />
            </Button>
        </div>
    );
}
