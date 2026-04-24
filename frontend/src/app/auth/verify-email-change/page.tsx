"use client";

import { Suspense } from "react";
import VerifyEmailChangeContent from "@/components/auth/verify-email-change-content";

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}
