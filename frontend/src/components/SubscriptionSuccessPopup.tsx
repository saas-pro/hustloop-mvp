"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function SubscriptionSuccessPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 bg-white/90 dark:bg-gray-900/90 rounded-xl p-6 max-w-md w-full shadow-2xl border border-green-500/20 backdrop-blur-sm"
      >
        <div className="text-center relative z-20">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100/80 dark:bg-green-900/50 p-3 rounded-full backdrop-blur-sm">
              <svg
                className="h-12 w-12 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Subscription Activated! 🎉
          </h3>
          <p className="text-gray-700 dark:text-gray-200 mb-6 font-medium">
            Thank you for subscribing to our premium plan! Your account has been upgraded successfully.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="px-8 py-2 text-base bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}