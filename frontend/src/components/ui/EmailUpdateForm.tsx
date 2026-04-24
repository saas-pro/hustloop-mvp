import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const emailSchema =(currentEmail:string) => z.object({
    email: z.string()
        .email('Please enter a valid email address')
        .refine((email) => {
            if (!currentEmail) return true;
            
            const currentProvider = currentEmail.split('@')[1]?.toLowerCase();
            const newProvider = email.split('@')[1]?.toLowerCase();
            
            if (currentProvider === 'gmail.com' && newProvider !== 'gmail.com') {
                return false;
            }
            return true;
        }, {
            message: 'Gmail users must keep using a Gmail address',
        }),

});

type EmailFormData = z.infer<ReturnType<typeof emailSchema>>;

export function EmailUpdateForm({ currentEmail }: { currentEmail: string }) {
    const form = useForm<EmailFormData>({
        resolver: zodResolver(emailSchema(currentEmail)),
        defaultValues: {
            email: currentEmail || '',
        },
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showVerificationDialog, setShowVerificationDialog] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    const handleRequestEmailUpdate = async (data: EmailFormData) => {
        if (data.email === currentEmail) {
            form.setError('email', { message: 'This is already your current email' });
            return;
        }
        
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token")
            const response = await fetch(`${API_BASE_URL}/api/request-email-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: data.email })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to send verification email');
            }

            setShowVerificationDialog(true);
            setIsEditing(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to send verification email';

            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncEmail = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/sync-email-after-verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to sync email');
            }

            toast({
                title: 'Success',
                description: 'Your email has been updated successfully',
            });

            setIsVerified(true);
            setTimeout(() => {
                setShowVerificationDialog(false);
                setIsVerified(false);
            }, 2000);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to send verification email';

            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRequestEmailUpdate)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center">
                                    <FormLabel>Email</FormLabel>
                                    {!isEditing ? (
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="p-0 h-auto text-sm"
                                            onClick={() => {
                                                setIsEditing(true);
                                                form.reset({ email: currentEmail });
                                            }}
                                        >
                                            Change
                                        </Button>
                                    ) : (
                                        <div className="space-x-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    form.reset();
                                                }}
                                                disabled={isLoading}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={isLoading || !form.formState.isDirty}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : null}
                                                Save
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="your@email.com"
                                        {...field}
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'bg-muted' : ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>

            <VerificationDialog
                isOpen={showVerificationDialog}
                onOpenChange={setShowVerificationDialog}
                onVerify={handleSyncEmail}
                isLoading={isLoading}
                isVerified={isVerified}
                currentEmail={form.watch('email')}
            />
        </div>
    );
}

function VerificationDialog({
    isOpen,
    onOpenChange,
    onVerify,
    isLoading,
    isVerified,
    currentEmail,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onVerify: () => void;
    isLoading: boolean;
    isVerified: boolean;
    currentEmail: string;
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isVerified ? 'Email Verified!' : 'Verify Your Email'}
                    </DialogTitle>
                    <DialogDescription>
                        {isVerified ? (
                            <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span>Your email has been updated successfully!</span>
                            </div>
                        ) : (
                            `We've sent a verification link to ${currentEmail || 'your email'}. Please check your inbox and click the link to complete the email update process.`
                        )}
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}