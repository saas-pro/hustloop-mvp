// src/data/testimonials.ts
import { Star } from "lucide-react";

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  avatar: string;
  rating: number; // Rating out of 5
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Alex Johnson",
    role: "Startup Founder",
    content: "Hustloop has transformed how we manage our projects. The intuitive interface and powerful features have saved us countless hours of work.",
    avatar: "/avatars/1.png",
    rating: 5
  },
  {
    id: 2,
    name: "Sarah Williams",
    role: "Product Manager",
    content: "The collaboration tools in Hustloop are exceptional. Our team's productivity has increased by 40% since we started using it.",
    avatar: "/avatars/2.png",
    rating: 4
  },
  {
    id: 3,
    name: "Michael Chen",
    role: "CTO, TechCorp",
    content: "The best project management solution we've used. The analytics and reporting features are particularly impressive.",
    avatar: "/avatars/3.png",
    rating: 5
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    role: "Marketing Director",
    content: "Hustloop's seamless integration with our existing tools made the transition smooth and painless. Highly recommended!",
    avatar: "/avatars/4.png",
    rating: 4
  }
];

// Utility function to render stars based on rating
export const renderStars = (rating: number) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};