import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IconCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const IconCard = React.forwardRef<HTMLDivElement, IconCardProps>(
  ({ className, icon, title, description, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        'group flex flex-col text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20',
        className
      )}
      {...props}
    >
      <CardContent className="flex flex-grow flex-col items-center gap-4 p-6">
        {/* Icon at the top */}
        <div className="w-28 h-28 rounded-lg bg-primary/10 p-4 flex items-center justify-center overflow-hidden">
          {icon}
        </div>
        {/* Title */}
        <h3 className="text-xl font-bold">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card >
  )
);
IconCard.displayName = 'IconCard';

export { IconCard };
