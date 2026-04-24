'use client'

import { API_BASE_URL } from '@/lib/api'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'


function EmailUpdateVerificationContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [message, setMessage] = useState('Verifying your email...')

    const verifyEmailUpdate = async (token: string) => {
        const response = await fetch(`${API_BASE_URL}/api/confirm-email-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        })
        const data = await response.json()

        localStorage.setItem('user', JSON.stringify({ "name": data.user.name, "email": data.user.email }))

        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify email update')
        }
        return data
    }

    useEffect(() => {
        const token = searchParams.get('token')
        if (!token) {
            setStatus('error')
            setMessage('Invalid verification link')
            toast({ variant: 'destructive', title: 'Invalid Token', description: 'Invalid or missing verification token' })
            return
        }

        const verify = async () => {
            try {
                await verifyEmailUpdate(token)
                setStatus('success')
                setMessage('Your email has been updated successfully!')
                toast({ title: 'Email updated successfully' })
                setTimeout(() => router.push('/'), 1000)
            } catch (error: any) {
                setStatus('error')
                setMessage(error.message || 'Failed to verify email update')
                toast({ variant: 'destructive', title: error.message || 'Email verification failed' })
            }
        }

        verify()
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                {status === 'verifying' && (
                    <div className="flex justify-center my-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {status === 'success' && <div className="text-green-500 text-5xl mb-4">✓</div>}
                {status === 'error' && <div className="text-red-500 text-5xl mb-4">✗</div>}

                <h2 className="text-2xl font-bold mb-4">
                    {status === 'verifying'
                        ? 'Verifying...'
                        : status === 'success'
                            ? 'Success!'
                            : 'Error'}
                </h2>

                <p className="text-gray-600 mb-6">{message}</p>

                {status === 'success' && (
                    <p className="text-sm text-gray-500">
                        Redirecting you to the Home Page...
                    </p>
                )}
            </div>
        </div>
    )
}

export default function EmailUpdateVerification() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        }>
            <EmailUpdateVerificationContent />
        </Suspense>
    )
}
