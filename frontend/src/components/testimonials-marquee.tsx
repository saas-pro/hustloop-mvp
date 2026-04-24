// src/components/testimonials-marquee.tsx
"use client"

import { Marquee } from "@/components/ui/marquee1"
import { TestimonialCard } from "./testimonial-card"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Testimonial, testimonials as staticTestimonials } from "@/data/testimonials"

export function TestimonialsMarquee() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/testimonials`)
        if (!response.ok) {
          throw new Error('Failed to fetch testimonials')
        }
        const data = await response.json()
        setTestimonials(data)
      } catch (err) {
        console.error('Error fetching testimonials:', err)
        setError('Failed to load testimonials')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error}
      </div>
    )
  }

  if (testimonials.length === 0) {
    setTestimonials(staticTestimonials)
  }

  const firstRow = [...testimonials, ...testimonials].slice(0, Math.ceil(testimonials.length * 1.5))

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-6">
      <Marquee
        className="[--duration:40s] py-4"
        reverse={false}
      >
        {firstRow.map((testimonial, index) => (
          <div key={`${testimonial.id}-${index}`} className="mx-4">
            <TestimonialCard {...testimonial} />
          </div>
        ))}
      </Marquee>

      <div className="pointer-events-none absolute inset-y-0 -left-20 w-1/4 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 -right-20 w-1/4 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}