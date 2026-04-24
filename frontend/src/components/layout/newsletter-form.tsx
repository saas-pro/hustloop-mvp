
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "../ui/moving-border";
import OfferHighlight from "../ui/offer-highlight";
import { SilverBorderButton } from "../ui/silver-border-button";

const newsletterSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

export default function NewsletterForm() {
  const { toast } = useToast();
  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: NewsletterFormValues) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscribe-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Subscription Successful!",
          description: result.message || "Please check your email to confirm your subscription.",
        });
        form.reset();
      } else {
        toast({
          variant: "destructive",
          title: "Subscription Failed",
          description: result.error || "An unknown error occurred.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server. Please try again later.",
      });
    }
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Stay in the loop!</h2>
      <p className="text-muted-foreground mb-8">
        Turn your idea into impact. Join our waitlist today and get <OfferHighlight>100% off</OfferHighlight> your first subscription when we launch.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start max-w-lg mx-auto gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email address..."
                      className="pl-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-left" />
              </FormItem>
            )}
          />
          <SilverBorderButton
            type="submit"
            disabled={isSubmitting}
            className="w-fit !whitespace-nowrap !py-0 !px-6 h-10 text-sm"
          >
            <div className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="text-current font-medium">Let Me In</span>
            </div>
          </SilverBorderButton>
        </form>
      </Form>
    </div>
  );
}
