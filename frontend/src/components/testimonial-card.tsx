// src/components/testimonial-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Star } from "lucide-react";
import { Testimonial } from "@/data/testimonials";

interface TestimonialCardProps extends Testimonial { }

const getGradientFromName = (name: string) => {
    const colors = [
        'from-blue-500 to-purple-500',
        'from-pink-500 to-rose-500',
        'from-emerald-500 to-cyan-500',
        'from-amber-500 to-orange-500',
        'from-violet-500 to-purple-500'
    ];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
};

export function TestimonialCard({ name, role, content, avatar, rating }: TestimonialCardProps) {
    const gradient = getGradientFromName(name);
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    return (
        <Card className="w-[350px] h-[250px] mx-4 p-6 bg-gradient-to-b from-card to-card/80 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="h-full p-0 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${gradient} text-current font-bold text-lg`}>
                        {initials}
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">{name}</h4>
                        <p className="text-sm text-muted-foreground">{role}</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                    <p className="text-foreground/90 mb-4 line-clamp-4">&quot;{content}&quot;</p>
                    <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-current' : 'text-muted-foreground/30'}`}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}