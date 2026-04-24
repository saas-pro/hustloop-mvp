
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import type { BlogPost } from '@/app/types';

interface BlogPostDetailsProps {
  post: BlogPost | null;
  onOpenChange: (isOpen: boolean) => void;
}

export default function BlogPostDetails({
  post,
  onOpenChange,
}: BlogPostDetailsProps) {
  if (!post) return null;

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline">
            {post.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground line-clamp-2">
            {post.excerpt}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow mt-4">
          <div className="space-y-6">
            <Image
              src={post.image}
              alt={post.title}
              width={800}
              height={400}
              className="rounded-lg w-full h-auto object-cover"
              data-ai-hint={post.hint}
            />
            <p className="text-muted-foreground whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
