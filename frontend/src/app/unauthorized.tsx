'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function Unauthorized() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <h1 className="text-8xl font-bold text-primary font-headline">401</h1>
            <h2 className="mt-4 text-3xl font-semibold">Unauthorized</h2>
            <p className="mt-2 text-muted-foreground">
                You don’t have access to this page
            </p>
            <Button asChild className="mt-8">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go back home
                </Link>
            </Button>
        </div>
    );
}
