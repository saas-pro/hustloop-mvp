'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Rocket, Calendar, Clock, X, Phone, Save, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  visible: boolean;
  register_enabled: boolean;
  phone: string;
  duration_info: string;
  registration_route: string;
}

interface EventModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  eventId?: string;
  mode?: 'view' | 'edit' | 'create';
  onUpdated?: () => void;
}

export default function EventModal({
  isOpen,
  onOpenChange,
  eventId,
  mode = 'view',
  onUpdated
}: EventModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    image_url: '/aignite.jpg',
    phone: '+91 9080895742',
    duration_info: '4 Hours/Day',
    registration_route: '/sif-aignite',
    visible: false,
    register_enabled: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload an image.' });
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('token');
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/events/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, image_url: data.image_url }));
        toast({ title: 'Success', description: 'Image uploaded successfully.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload image.' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchEventDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen && eventId && (mode === 'edit' || mode === 'view')) {
      fetchEventDetails();
    } else if (isOpen && mode === 'create') {
      setFormData({
        title: '',
        description: '',
        image_url: '/aignite.jpg',
        phone: '+91 9080895742',
        duration_info: '4 Hours/Day',
        registration_route: '/sif-aignite',
        visible: false,
        register_enabled: true
      });
    }
  }, [isOpen, eventId, mode, fetchEventDetails]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token');

    const url = mode === 'create'
      ? `${API_BASE_URL}/api/events`
      : `${API_BASE_URL}/api/events/${eventId}`;

    const method = mode === 'create' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({ title: 'Success', description: `Event ${mode === 'create' ? 'created' : 'updated'} successfully.` });
        onUpdated?.();
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save event.' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to the server.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    onOpenChange(false);
    const route = formData.registration_route || '/sif-aignite';
    if (route.match(/^(https?:\/\/|www\.)/i)) {
      const url = route.startsWith('http') ? route : `https://${route}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(route);
    }
  };

  if (mode === 'edit' || mode === 'create') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create New Event' : 'Edit Event'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the event. This will be shown to users.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event Title"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event Description"
                rows={7}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="text-sm font-medium">Event Poster / Image</label>

                {/* Image Preview Block */}
                <div className={`flex ${formData.image_url ? 'gap-x-2' : 'gap-x-0'}`}>
                  {formData.image_url && (
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden border bg-muted group">
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        width={128}
                        height={128}
                        className="object-cover"
                        unoptimized={!formData.image_url.startsWith('/')}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="/aignite.jpg"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="shrink-0"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration Info</label>
                <Input
                  value={formData.duration_info}
                  onChange={(e) => setFormData({ ...formData, duration_info: e.target.value })}
                  placeholder="4 Hours/Day"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Registration Route</label>
                <Input
                  value={formData.registration_route}
                  onChange={(e) => setFormData({ ...formData, registration_route: e.target.value })}
                  placeholder="/sif-aignite"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {mode === 'create' ? 'Create Event' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // View Mode (Home Page)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[600px] max-w-sm p-0 overflow-hidden bg-transparent border rounded-md text-white">
        <div className="relative">
          {/* Banner Image */}
          <div className="relative h-auto md:h-[90vh]">
            <Image
              src={formData?.image_url || ""}
              alt={formData.title || "Event"}
              height={100}
              width={100}
              className="object-cover w-full h-full"
            />
            {/* Dark gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Close button */}
          <DialogClose className="absolute right-4 top-4 rounded-none bg-background/50 text-foreground/80 hover:bg-background/75 hover:text-foreground transition-opacity z-20">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Overlay content with translucent background */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
              <DialogHeader className="space-y-4">
                <DialogTitle className="text-4xl font-bold font-headline text-white">
                  {formData.title}
                </DialogTitle>

                <p className="text-sm sm:text-base leading-relaxed text-white/90">
                  {formData.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm sm:text-base text-white/80 mt-4">
                  {formData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.duration_info && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span>{formData.duration_info}</span>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {formData.register_enabled !== false && (
                <DialogFooter className="mt-6 sm:justify-start">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={handleRegisterClick}
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    Register Now
                  </Button>
                </DialogFooter>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
