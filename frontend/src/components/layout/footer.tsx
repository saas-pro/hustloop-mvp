
"use client";
import { Instagram, Linkedin, Mail, Youtube } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import NewsletterForm from "./newsletter-form";
import Image from 'next/image';
import { usePathname } from "next/navigation";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export default function Footer() {
  const pathname = usePathname();
  const hideNewsletter = ['/privacy-policy', '/terms-of-service', '/incentive-challenge', '/aignite', '/contact-us', '/pricing', '/pitching-form'].includes(pathname);

  return (
    <footer className="relative bg-background border-t" id="contact-section">
      <div className="z-10 container mx-auto pt-12 px-4 space-y-12 bg-background">
        {!hideNewsletter && (
          <>
            <div id="newsletter-section">
              <NewsletterForm />
            </div>
            <Separator />
          </>
        )}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
          {/* Left: Logo and Tagline - COMMENTED OUT */}
          {/* <div className="flex-1 flex justify-center md:justify-start">
            <div className="flex items-center gap-3 text-center md:text-left">
              <Image
                src="/logo.png"
                alt="Hustloop logo"
                width={120}
                height={48}
                className="h-12 w-auto min-w-[120px] max-w-[200px] object-contain"
              />
              <Separator orientation="vertical" className="h-8 bg-border hidden md:block" />
              <p className="text-muted-foreground hidden md:block">
                Smart hustle. <br /> Infinite growth..
              </p>
            </div>
          </div> */}

          {/* Left: Copyright and Legal */}
          <div className="flex-1 flex justify-center md:justify-start">
            <div className="text-center md:text-left text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Hustloop Inc. All rights reserved.</p>
              <div className="flex gap-4 justify-center md:justify-start mt-1">
                <a href="/terms-of-service" className="text-xs hover:text-primary transition-colors">Terms of Service</a>
                <a href="/privacy-policy" className="text-xs hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>

          {/* Right: Social Icons */}
          <div className="flex-1 flex justify-center md:justify-end mb-3 md:mb-0">
            <div className="flex items-center gap-4">
              <a href="https://x.com/hustloop" target="_blank" aria-label="X" className="text-muted-foreground hover:text-black [.theme-dark_&]:hover:text-white [.theme-purple_&]:hover:text-white [.theme-orange_&]:hover:text-white [.theme-blue-gray_&]:hover:text-white transition-colors">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px] fill-current">
                  <title>X</title>
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.931L18.901 1.153Zm-1.653 19.57h2.608L6.856 2.597H4.062l13.185 18.126Z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/hustloop/" target="_blank" aria-label="LinkedIn" className="text-muted-foreground hover:text-[#0A66C2] transition-colors">
                <Linkedin className="h-6 w-6" />
              </a>
              <a href="mailto:support@hustloop.com" aria-label="Email" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/hustloop_official"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-[#E1306C] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://www.youtube.com/@hustloop_talks" target="_blank" aria-label="YouTube" className="text-muted-foreground hover:text-[#FF0000] transition-colors">
                <svg className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full flex items-start justify-center overflow-hidden h-[80px] md:h-[100px] lg:h-[200px]">
        <div className="w-full relative h-[120px] md:h-[200px] lg:h-[400px] flex items-start justify-center">
          <TextHoverEffect text="HUSTLOOP" duration={10} />
        </div>
      </div>
    </footer>
  );
}
