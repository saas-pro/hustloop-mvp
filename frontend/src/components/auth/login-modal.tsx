
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserRole, View } from "@/app/types";
import { API_BASE_URL } from "@/lib/api";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { useRouter } from "next/navigation";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters long." }),
});

type LoginSchema = z.infer<typeof loginSchema>;

const forceResetPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string()
    .min(10, { message: "Password must be at least 10 characters long." })
    .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter." })
    .regex(/[a-z]/, { message: "Must contain at least one lowercase letter." })
    .regex(/[0-9]/, { message: "Must contain at least one number." })
    .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

type ForceResetPasswordSchema = z.infer<typeof forceResetPasswordSchema>;

type AuthProvider = 'local' | 'google';

interface LoginModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onLoginSuccess: (data: { role: UserRole, token: string, hasSubscription: boolean, founder_role: string, name: string, email: string, authProvider: AuthProvider }) => void;
}

export default function LoginModal({ isOpen, setIsOpen, activeView, setActiveView, onLoginSuccess }: LoginModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { auth } = useFirebaseAuth();
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [isMustResetPassword, setIsMustResetPassword] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [showResetPasswords, setShowResetPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const forceResetForm = useForm<ForceResetPasswordSchema>({
    resolver: zodResolver(forceResetPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { formState: { isSubmitting }, getValues } = form;

  const preloadRecaptcha = () => {
    const scriptId = 'recaptcha-preload-link';
    if (!document.getElementById(scriptId)) {
      const link = document.createElement('link');
      link.id = scriptId;
      link.rel = 'preload';
      link.as = 'script';
      link.href = 'https://www.google.com/recaptcha/enterprise.js?render=6LfZ4H8rAAAAAA0NMVH1C-sCiE9-Vz4obaWy9eUI';
      document.head.appendChild(link);
    }
  };

  const [resetLoadingBtn, setResetLoadingBtn] = useState(false)

  const handleAuthClick = (view: 'login' | 'signup') => {
    preloadRecaptcha();
    setActiveView(view);
  };

  const handleResendVerification = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({ title: "Email Sent", description: result.message });
        setIsOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Resend",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to server.",
      });
    }
  };


  const handlePasswordLogin = async (values: LoginSchema) => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Authentication service is not available.' });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        await handleResendVerification(values.email);
        toast({
          variant: "destructive",
          title: "Email Not Verified",
          description: (
            <div className="flex flex-col gap-2">
              <span>Please check your inbox to verify your email.</span>
              <button
                onClick={() => handleResendVerification(values.email)}
                className="px-3 py-1 rounded-md bg-primary text-white hover:bg-primary/80"
              >
                Resend Verification Email
              </button>
            </div>
          ),
        });
        return;
      }

      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.action === 'complete-profile' && data.token) {
        router.push(`/complete-profile?token=${data.token}`);
        return;
      }

      if (data.must_reset_password) {
        setTempToken(data.token);
        setIsMustResetPassword(true);
        return;
      }

      setIsOpen(false);
      if (response.ok) {
        onLoginSuccess({
          role: data.role, token: data.token, hasSubscription: data.hasSubscription,
          name: data.name, email: data.email, authProvider: 'local', founder_role: data.founder_role
        });
        // Dispatch storage event to trigger immediate update in pricing components
        window.dispatchEvent(new Event('storage'));
      } else {
        toast({ variant: 'destructive', title: 'Login Failed', description: data.error || 'An error occurred.' });
      }
    } catch (error: any) {
      let description = "Invalid email or password.";
      if (error.code === 'auth/invalid-api-key') {
        description = "API key is not valid. Please check your configuration."
      }
      toast({ variant: "destructive", title: "Login Failed", description });
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Authentication service is not available.' });
      return;
    }
    setIsSocialLoading(true);
    const authProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, authProvider);
      const idToken = await result.user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      const data = await response.json();

      setIsOpen(false);
      if (data.action === 'complete-profile' && data.token) {
        router.push(`/complete-profile?token=${data.token}`);
        return;
      }

      if (response.ok) {
        onLoginSuccess({
          role: data.role, token: data.token, hasSubscription: data.hasSubscription,
          name: data.name, email: data.email, authProvider: 'google', founder_role: data.founder_role
        });
        // Dispatch storage event to trigger immediate update in pricing components
        window.dispatchEvent(new Event('storage'));
      } else {
        toast({ variant: 'destructive', title: 'Login Failed', description: data.error || 'An error occurred.' });
      }
    } catch (error: any) {
      let description = error.message || 'An error occurred while signing in.';
      toast({ variant: 'destructive', title: 'Social Login Failed', description });
    } finally {
      setIsSocialLoading(false);
    }
  };

  const [resetBtnState, setResetBtnState] = useState<"idle" | "sending" | "sent">("idle");


  const handlePasswordReset = async () => {
    const email = getValues("email");

    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      });
      return;
    }

    setResetBtnState("sending");

    setTimeout(() => {
      setResetBtnState("sent");
      toast({
        title: "Password Reset Email Sent",
        description:
          "If this email is registered, a reset link has been sent.",
      });
    }, 1000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();


      // if (!(response.ok)) {
      //   toast({
      //     variant: "destructive",
      //     title: "Not Found",
      //     description:
      //       result.error
      //   });
      //   setResetBtnState("idle");
      // }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: "Something went wrong. Please try again later.",
      });
      setResetBtnState("idle");
    } finally {
      setTimeout(() => setResetBtnState("idle"), 2000);
    }
  };


  const handleForceReset = async (values: ForceResetPasswordSchema) => {
    if (!tempToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Your password has been updated successfully. Please login with your new password.",
        });
        setIsMustResetPassword(false);
        setIsOpen(false);
        forceResetForm.reset();
        setTempToken(null);
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: result.error || "An unknown error occurred.",
        });
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not update password. Please try again later.",
      });
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader className="text-center">
          <DialogTitle>{isMustResetPassword ? "Reset Password" : "Login"}</DialogTitle>
          <DialogDescription>{isMustResetPassword ? "You must reset your password to continue." : "Access your hustloop account."}</DialogDescription>
        </DialogHeader>

        {isMustResetPassword ? (
          <Form {...forceResetForm}>
            <form onSubmit={forceResetForm.handleSubmit(handleForceReset)} className="space-y-4">
              <FormField
                control={forceResetForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showResetPasswords.current ? "text" : "password"}
                          {...field}
                          className="pr-16"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                          <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>{field.value?.length || 0}</span>
                          <button
                            type="button"
                            onClick={() => setShowResetPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="hover:text-foreground focus:outline-none"
                            tabIndex={-1}
                          >
                            {showResetPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={forceResetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showResetPasswords.new ? "text" : "password"}
                          {...field}
                          className="pr-16"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                          <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>{field.value?.length || 0}</span>
                          <button
                            type="button"
                            onClick={() => setShowResetPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="hover:text-foreground focus:outline-none"
                            tabIndex={-1}
                          >
                            {showResetPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Must be 10+ characters with uppercase, lowercase, number, and special character.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={forceResetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showResetPasswords.confirm ? "text" : "password"}
                          {...field}
                          className="pr-16"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                          <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>{field.value?.length || 0}</span>
                          <button
                            type="button"
                            onClick={() => setShowResetPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="hover:text-foreground focus:outline-none"
                            tabIndex={-1}
                          >
                            {showResetPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={forceResetForm.formState.isSubmitting}>
                  {forceResetForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              <Button variant="outline" onClick={() => handleSocialLogin('google')}>
                <GoogleIcon className="mr-2 h-4 w-4" /> Sign in with Google</Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handlePasswordLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => {


                    return (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Password</FormLabel>
                          {resetBtnState === "sent" ? (
                            <div className="text-xs text-ring">Sent</div>
                          ) : (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-xs flex items-center gap-1"
                              onClick={handlePasswordReset}
                              disabled={resetBtnState === "sending"}
                            >
                              {resetBtnState === "sending" ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Forgot password?"
                              )}
                            </Button>
                          )}

                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              disabled={isSubmitting}
                              className="pr-16"
                            />
                            <span className={`text-xs absolute right-10 top-1/2 -translate-y-1/2 ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>{field.value?.length || 0}</span>
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              tabIndex={-1} // prevent focus stealing
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </DialogFooter>
                <div className="flex justify-center items-center">
                  <div>
                    <Button variant="link" type="button" className="text-xs block p-0 h-auto" onClick={() => { handleAuthClick('signup'); }}>
                      {`Don't have an account? Sign Up`}
                    </Button>
                  </div>
                </div>
              </form>

            </Form>
          </>
        )}
      </DialogContent>
    </Dialog >
  );
}
