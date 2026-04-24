"use client";

import { Suspense, useState, useEffect } from "react";
import MainView from "@/components/views/main-view";
import PageLoader from "@/components/layout/page-loader";
import EventModal from "@/components/views/event-modal";
import { useTokenVerification } from "@/hooks/use-token-verification";
import type { UserRole, View } from "@/app/types";
import { API_BASE_URL } from "@/lib/api";

type AuthProvider = 'local' | 'google';

type User = {
  name: string;
  email: string;
  userId: string;
}

export default function Home() {
  const [showLoader, setShowLoader] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const [isLoggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [appliedPrograms, setAppliedPrograms] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<View>("home");
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<any>(null);

  useTokenVerification({
    setActiveView
  });

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events`);
        if (response.ok) {
          const data = await response.json();
          const active = data.find((ev: any) => ev.visible);
          if (active) {
            setActiveEvent(active);
          }
        }
      } catch (error) {
        console.error('Error fetching active event:', error);
      }
    };
    fetchActiveEvent();
  }, []);

  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;
    let fadeTimer: NodeJS.Timeout;

    const stopLoading = () => {
      setIsAnimating(true);
      fadeTimer = setTimeout(() => {
        setShowLoader(false);
        if (activeEvent) {
          setEventModalOpen(true);
        }
      }, 250);
    };

    const handleLoaderComplete = () => {
      clearTimeout(fallbackTimer);
      stopLoading();
    };

    window.addEventListener('page-loader-complete', handleLoaderComplete);

    // Fallback: If video takes longer than 8 seconds, just show the site
    fallbackTimer = setTimeout(() => {
      window.removeEventListener('page-loader-complete', handleLoaderComplete);
      stopLoading();
    }, 4000);

    return () => {
      window.removeEventListener('page-loader-complete', handleLoaderComplete);
      clearTimeout(fallbackTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [activeEvent]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <MainView />
      </Suspense>
      {showLoader && (
        <div
          className={`fixed font-headline inset-0 z-50 bg-background transition-transform duration-500 ease-in-out ${isAnimating ? '-translate-y-full' : 'translate-y-0'
            }`}
        >
          <PageLoader />
        </div>
      )}
      {activeEvent && (
        <EventModal
          isOpen={isEventModalOpen}
          onOpenChange={setEventModalOpen}
          eventId={activeEvent.id}
          mode="view"
        />
      )}
    </>
  );
}
