'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Star, Check } from 'lucide-react';

const steps = [
  {
    id: 'name',
    title: 'What\'s your name?',
    description: 'Let us know how to address you',
    fields: ['name'],
  },
  {
    id: 'role',
    title: 'What\'s your role/position?',
    description: 'E.g., CEO at Company, Marketing Manager, etc.',
    fields: ['role'],
  },
  {
    id: 'content',
    title: 'Share your experience',
    description: 'What would you like to tell others about us?',
    fields: ['content'],
  },
  {
    id: 'rating',
    title: 'How would you rate us?',
    description: 'Tap to rate your experience',
    fields: ['rating'],
  },
];

function TestimonialSubmissionFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    content: '',
    rating: 0,
    avatar: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) {
          throw new Error('No token provided');
        }

        const response = await fetch(
          `${API_BASE_URL}/api/testimonials/validate-token/${token}`
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Invalid or expired token');
        }

        setIsValidToken(true);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Invalid testimonial request',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const nextStep = () => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/testimonials/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          token,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to submit testimonial');
      }

      toast({
        title: 'Thank you!',
        description: 'Your testimonial has been submitted successfully.',
      });

      // Set submitted state to show thank you message
      setIsSubmitted(true);

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit testimonial',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const step = steps[currentStep];

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: direction > 0 ? 50 : -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: direction > 0 ? -50 : 50 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto relative"
      >


        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-muted'
                    }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-16 h-1 bg-muted mx-1" />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
          <p className="text-muted-foreground">{step.description}</p>
        </div>

        <div className="space-y-6">
          {step.id === 'name' && (
            <div className="space-y-4">
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="text-lg py-6 text-center"
                autoFocus
                required
              />
            </div>
          )}

          {step.id === 'role' && (
            <div className="space-y-4">
              <Input
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="E.g., CEO at Company"
                className="text-lg py-6 text-center"
                autoFocus
                required
              />
            </div>
          )}

          {step.id === 'content' && (
            <div className="space-y-4">
              <Textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Share your experience with us..."
                className="text-lg min-h-[200px]"
                autoFocus
                required
              />
            </div>
          )}

          {step.id === 'rating' && (
            <div className="flex justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  className={`text-5xl transition-colors ${star <= formData.rating ? 'text-yellow-400' : 'text-gray-200'
                    }`}
                  aria-label={`${star} star`}
                >
                  ★
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="w-24"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!formData[steps[currentStep].fields[0] as keyof typeof formData]}
                className="w-24"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={formData.rating === 0 || isSubmitting}
                className="w-24"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Submit'
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderThankYouScreen = () => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto text-center"
      >

        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-green-600" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Thank You for Your Submission!
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Your testimonial has been successfully submitted and is greatly appreciated.
            Your feedback helps us improve our services and assists others in making informed decisions.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm leading-relaxed ">
            <strong className="font-headline text-xl">Have any questions or concerns?</strong><br />
            Please don&apos;t hesitate to contact us. We&apos;re here to help and would be delighted
            to assist you with any inquiries you may have.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3"
          >
            Return to Homepage
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = 'mailto:support@hustloop.com'}
            className="w-full border-gray-300 hover:bg-gray-50 font-medium py-3"
          >
            Contact Support
          </Button>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <div className="absolute top-4 left-4">
          <Image
            src="/logo.png"
            alt="Company Logo"
            width={200}
            height={200}
            className="object-contain"
          />
        </div>
        <div className="text-center space-y-4 max-w-md p-6">
          <h1 className="text-2xl font-bold">Invalid Request</h1>
          <p className="text-muted-foreground">
            The testimonial request link is invalid or has expired.
          </p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4">
        <Image
          src="/logo.png"
          alt="Company Logo"
          width={200}
          height={200}
          className="object-contain"
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {isSubmitted ? (
          renderThankYouScreen()
        ) : (
          renderStep()
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TestimonialSubmissionForm() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading form...</p>
        </div>
      </div>
    }>
      <TestimonialSubmissionFormContent />
    </Suspense>
  );
}