"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Instagram, Linkedin, Loader2, Mail, Send } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

// -----------------------------
// Contact form schema
// -----------------------------
const contactFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").max(300, "Full name must not exceed 300 characters."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().max(10, "Phone number must not exceed 10 digits.").optional(),
  subject: z.string({ required_error: "Select a subject." }),
  message: z.string().min(10, "Message must be at least 10 characters.").max(500),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [navOpen, setNavOpen] = useState(false);

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { fullName: "", email: "", phone: "", message: "" },
  });

  const { formState: { isSubmitting }, reset } = contactForm;

  useEffect(() => {
    if (navOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";

    return () => { document.body.style.overflow = "auto"; };
  }, [navOpen]);

  const headerProps = {
    activeView: "home" as const,
    setActiveView: () => { },
    isLoggedIn: false,
    onLogout: () => { },
    isLoading: false,
    isStaticPage: true,
    navOpen,
    setNavOpen,
    heroVisible: false,
  };

  async function onContactSubmit(data: ContactFormValues) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({ title: "Message Sent!", description: "We'll get back to you soon." });
        reset();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: result.error || "Unknown error occurred.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not connect to server.",
      });
    }
  }

  return (
    <div className="flex flex-col">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
        <div onClick={() => router.push("/")} className="cursor-pointer">
          <Image src="/logo.png" alt="Hustloop Logo" width={120} height={120} />
        </div>
        <Link href="/" passHref>
          <Button variant="outline" size="icon" aria-label="Home">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <main className="flex-grow container relative z-40 ultrawide-fix m-auto px-4 py-12 md:pt-14 mt-16">
        <section className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <Card className="p-8 lg:p-12 flex-col justify-center flex">
            <CardHeader className="p-0">
              <CardTitle className="text-4xl font-bold font-headline">
                Ready to build the{" "}
                <span className="relative inline-block z-10 pt-2 md:pt-0">
                  Future
                  <svg
                    className="absolute w-[114px] md:w-[114px] -right-[2px] -bottom-[12px] md:-bottom-[10px] z-0"
                    aria-hidden="true"
                    role="presentation"
                    viewBox="0 0 114 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ pointerEvents: "none" }}
                  >
                    <path
                      d="M61.1407 5.29573C61.5825 5.29573 61.9407 4.93755 61.9407 4.49573C61.9407 4.0539 61.5825 3.69573 61.1407 3.69573V5.29573ZM25.6313 1.18441L25.5712 0.386673L25.6313 1.18441ZM65.1859 56.529L65.2466 57.3267L65.1859 56.529ZM102.238 49.5437L102.146 50.3384L102.238 49.5437ZM113 59L112.33 59.4366C112.546 59.7688 112.973 59.8924 113.333 59.7273C113.694 59.5621 113.879 59.1579 113.768 58.7772L113 59ZM113.483 45.9598C113.667 45.5584 113.492 45.0833 113.09 44.8986C112.689 44.7139 112.214 44.8896 112.029 45.291L113.483 45.9598ZM9.10831 45.245L8.60696 45.8685L8.60698 45.8685L9.10831 45.245ZM61.1407 3.69573C55.3296 3.69573 50.2958 2.60385 44.7326 1.62791C39.1822 0.654208 33.1789 -0.18624 25.5712 0.386673L25.6913 1.98216C33.1047 1.42388 38.9568 2.23909 44.4562 3.20384C49.9428 4.16636 55.1532 5.29573 61.1407 5.29573V5.29573ZM102.146 50.3384C103.978 50.5502 105.816 51.7049 107.587 53.4268C109.346 55.1369 110.954 57.3236 112.33 59.4366L113.67 58.5634C112.268 56.4103 110.585 54.1104 108.703 52.2797C106.832 50.4607 104.678 49.0204 102.329 48.749L102.146 50.3384ZM113.768 58.7772C113.392 57.4794 112.891 55.17 112.707 52.7136C112.521 50.2318 112.669 47.729 113.483 45.9598L112.029 45.291C111.04 47.4401 111.092 50.2798 111.112 52.8333C111.305 55.4122 111.828 57.8311 112.232 59.2228L113.768 58.7772ZM25.5712 0.386673C12.1968 1.39385 4.12231 9.70072 1.32012 19.2877C-1.46723 28.8239 0.948311 39.7092 8.60696 45.8685L9.60967 44.6216C2.5531 38.9466 0.211996 28.7819 2.85587 19.7366C5.4849 10.742 13.0295 2.93568 25.6913 1.98216L25.5712 0.386673ZM8.60698 45.8685C17.052 52.6596 27.4766 55.8004 37.6285 57.1087C47.7823 58.4172 57.7242 57.8998 65.2466 57.3267L65.1251 55.7313C57.6265 56.3026 47.8183 56.8086 37.833 55.5218C27.8456 54.2347 17.7419 51.1613 9.60965 44.6216L8.60698 45.8685ZM65.2466 57.3267C71.9263 56.8179 78.8981 54.7692 85.2941 53.0195C91.7606 51.2505 97.5723 49.8099 102.146 50.3384L102.329 48.749C97.3895 48.1782 91.2605 49.7286 84.8719 51.4762C78.4129 53.2432 71.6155 55.2369 65.1251 55.7313L65.2466 57.3267Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                ?
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <p className="text-muted-foreground mb-4">
                Join Hustloop today and let’s turn your vision into reality.
              </p>

              <p className="font-semibold text-sm">Email us</p>
              <a href="mailto:support@hustloop.com" className="text-primary hover:underline">
                support[@]hustloop.com
              </a>

              <div className="flex gap-4 mt-4">
                <a href="https://x.com/hustloop" target="_blank">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93ZM17.25 20.72h2.6L6.86 2.6H4.06l13.19 18.12Z" /></svg>
                </a>
                <a href="https://www.linkedin.com/company/hustloop/" target="_blank">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="mailto:support@hustloop.com" target="_blank">
                  <Mail className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/hustloop_official"
                  target="_blank"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="p-8 lg:p-12">
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                <FormField
                  control={contactForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="Your name" {...field} className="pr-16" />
                        </FormControl>
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${field.value?.length >= 300 ? "text-red-500" : "text-muted-foreground"}`}>
                          {field.value?.length || 0}/300
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={contactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={contactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type="tel" placeholder="Phone number" {...field} className="pr-16" />
                        </FormControl>
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${(field.value?.length || 0) >= 10 ? "text-red-500" : "text-muted-foreground"}`}>
                          {field.value?.length || 0}/10
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject */}
                <FormField
                  control={contactForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="mentorship">Mentorship Programs</SelectItem>
                          <SelectItem value="incubation">Incubation Support</SelectItem>
                          <SelectItem value="organisation">Organisation Partnerships</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="tech-transfer">Technology Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Message */}
                <FormField
                  control={contactForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Textarea placeholder="How can we help?" {...field} className="pb-6" />
                        </FormControl>
                        <span className={`absolute right-3 bottom-2 text-xs ${field.value?.length >= 500 ? "text-red-500" : "text-muted-foreground"}`}>
                          {field.value?.length || 0}/500
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>

              </form>
            </Form>
          </Card>

        </section>
      </main>
      <div className="w-full mt-6">
        <Footer />
      </div>
    </div>
  );
}
