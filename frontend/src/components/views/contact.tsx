
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Send, Linkedin, Twitter, Github, Facebook, Instagram, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { API_BASE_URL } from "@/lib/api";


const contactFormSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string().optional(),
    subject: z.string({ required_error: "Please select a subject." }),
    message: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message must not exceed 500 characters."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;


interface ContactViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ContactView({ isOpen, onOpenChange }: ContactViewProps) {
    const { toast } = useToast();
    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: { fullName: "", email: "", phone: "", message: "" },
    });

    const { formState: { isSubmitting } } = form;

    async function onSubmit(data: ContactFormValues) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Message Sent!",
                    description: "Thank you for reaching out. We'll get back to you shortly.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Submission Failed",
                    description: result.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "Could not connect to the server. Please try again later.",
            });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0">
                <ScrollArea className="h-full">
                    <div className="p-8 md:p-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 font-headline text-primary">
                            WHERE VISION MEETS OPPORTUNITY
                        </h1>

                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Left side: Contact Info */}
                            <div className="space-y-8 flex flex-col">
                                <div>
                                    <h2 className="text-3xl font-bold font-headline mb-4">Get in Touch</h2>
                                    <p className="text-muted-foreground">
                                        Have questions about our services? We&apos;re here to help! Fill out the form and we&apos;ll get back to you as soon as possible.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <MapPin className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h3 className="text-lg font-semibold">Visit Us</h3>
                                            <p className="text-muted-foreground">
                                                45 Five Roads<br />
                                                Salem, Tamil Nadu 636005
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Phone className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h3 className="text-lg font-semibold">Call Us</h3>
                                            <p className="text-muted-foreground">+91 98765 43210</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Mail className="h-6 w-6 text-primary mt-1" />
                                        <div>
                                            <h3 className="text-lg font-semibold">Email Us</h3>
                                            <p className="text-muted-foreground">support@hustloop.com</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-auto pt-8">
                                    <a href="https://www.linkedin.com/company/hustloop/" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-muted rounded-full">
                                        <Linkedin className="h-5 w-5" />
                                    </a>
                                    <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-muted rounded-full">
                                        <Twitter className="h-5 w-5" />
                                    </a>
                                    <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-muted rounded-full">
                                        <Facebook className="h-5 w-5" />
                                    </a>
                                    <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-muted rounded-full">
                                        <Instagram className="h-5 w-5" />
                                    </a>
                                    <a href="#" aria-label="GitHub" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-muted rounded-full">
                                        <Github className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>

                            {/* Right side: Contact Form */}
                            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-8 shadow-lg">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="fullName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name</FormLabel>
                                                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Address</FormLabel>
                                                    <FormControl><Input type="email" placeholder="Enter your email address" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number (Optional)</FormLabel>
                                                    <FormControl><Input type="tel" placeholder="Enter your phone number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subject"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subject</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="general">General Inquiry</SelectItem>
                                                            <SelectItem value="mentorship">Mentorship Programs</SelectItem>
                                                            <SelectItem value="incubation">Incubation Support</SelectItem>
                                                            <SelectItem value="msme">Organisation Partnerships</SelectItem>
                                                            <SelectItem value="support">Support</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="message"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Message</FormLabel>
                                                    <FormControl><Textarea placeholder="How can we help you?" rows={4} {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="mr-2 h-4 w-4" />
                                            )}
                                            {isSubmitting ? 'Sending...' : 'Send Message'}
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
