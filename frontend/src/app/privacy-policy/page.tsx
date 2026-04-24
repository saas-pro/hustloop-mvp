"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, X } from 'lucide-react';
import Footer from '@/components/layout/footer';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  const [lastUpdated, setLastUpdated] = useState('');
  const [navOpen, setNavOpen] = useState(false);

  // This prevents hydration mismatch by rendering the date only on the client.
  useEffect(() => {
    setLastUpdated(
      new Date("06-05-2025").toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    if (navOpen) {
      // lock body scroll
      document.body.style.overflow = 'hidden';

      const cardSection = document.querySelector('[data-alt-id="card-anchor"]');
      if (cardSection) {
        cardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [navOpen]);

  // Dummy props for the Header
  const headerProps = {
    activeView: 'home' as const,
    setActiveView: () => { },
    isLoggedIn: false,
    onLogout: () => { },
    isLoading: false,
    isStaticPage: true,
    navOpen,
    setNavOpen,
    heroVisible: false,
  };
  const router = useRouter();

  return (
    <div className="overflow-hidden relative flex flex-col min-h-screen bg-background">
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
      <Header {...headerProps} />
      <div id="main-view-wrapper">
        <main
          className={`flex-grow bg-background min-h-screen relative z-40 m-auto pointer-events-auto w-full flex flex-col`}
          data-alt-id="card-anchor"
          id="main-view1"
        >
          <div className={`container ultrawide-fix mx-auto px-4 py-12 md:pb-4 md:pt-14 ${navOpen ? 'overflow-hidden' : ''} pt-20 md:pt-20 flex-grow`}>
            <Card>
              <div className="relative">
                <CardHeader>
                  <CardTitle className="text-3xl md:text-4xl font-headline">
                    Privacy Policy
                  </CardTitle>
                  <p className="text-muted-foreground">Last Updated: {lastUpdated}</p>
                </CardHeader>
                <Link
                  href="/"
                  className="absolute top-4 right-4 p-2 "
                  aria-label="Close and return home"
                >
                  <X className="h-6 w-6" />
                </Link>
              </div>
              <CardContent>
                <ScrollArea
                  className="max-h-[60vh] pr-6 overflow-auto touch-auto"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain', // Prevents scroll chaining
                  }}
                >
                  <div className="space-y-6">
                    <p>
                      Hustloop (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                      is committed to protecting your privacy. This Privacy Policy
                      explains how your personal information is collected, used, and
                      disclosed by Hustloop.
                    </p>

                    <h3 className="font-bold text-xl">1. Information We Collect</h3>
                    <p>
                      We collect information you provide directly to us, such as
                      when you create an account, subscribe, contact us for support,
                      or otherwise communicate with us. The types of information we
                      may collect include your name, email address, password,
                      payment information, and any other information you choose to
                      provide.
                    </p>

                    <h3 className="font-bold text-xl">
                      2. How We Use Your Information
                    </h3>
                    <p>
                      We use the information we collect to operate, maintain, and
                      provide the features and functionality of the Hustloop
                      platform, including to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Create and manage your account.</li>
                      <li>
                        Process transactions and send you related information,
                        including confirmations and invoices.
                      </li>
                      <li>
                        Communicate with you about products, services, offers, and
                        events.
                      </li>
                      <li>
                        Monitor and analyze trends, usage, and activities in
                        connection with our services.
                      </li>
                      <li>
                        Personalize the services and provide advertisements,
                        content, or features that match user profiles or interests.
                      </li>
                    </ul>

                    <h3 className="font-bold text-xl">
                      3. How We Share Your Information
                    </h3>
                    <p>
                      We may share your information with third-party vendors and
                      service providers that provide services on our behalf, such as
                      payment processing, data analysis, email delivery, and hosting
                      services. We may also share information if we believe
                      disclosure is necessary to comply with any applicable law,
                      regulation, legal process, or governmental request.
                    </p>

                    <h3 className="font-bold text-xl">4. Your Choices</h3>
                    <p>
                      You may update, correct, or delete information about you at
                      any time by logging into your online account or emailing us at
                      support@hustloop.com. If you wish to delete your account,
                      please contact us, but note that we may retain certain
                      information as required by law or for legitimate business
                      purposes.
                    </p>

                    <h3 className="font-bold text-xl">5. Changes to This Policy</h3>
                    <p>
                      We may change this Privacy Policy from time to time. If we
                      make changes, we will notify you by revising the date at the
                      top of the policy and, in some cases, we may provide you with
                      additional notice.
                    </p>

                    <h3 className="font-bold text-xl">Contact Us</h3>
                    <p>
                      If you have any questions about this Privacy Policy, please
                      contact us at: support@hustloop.com.
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="block w-full pt-8">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
