'use client';

import { useState } from 'react';
import type { Mentor } from '@/components/views/mentors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { IndianRupee, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface MentorBookingModalProps {
  mentor: Mentor | null;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  hasUsedFreeSession: boolean;
  onBookingSuccess: (mentorName: string, date: Date, time: string) => void;
}

export default function MentorBookingModal({ mentor, onOpenChange, isLoggedIn, hasSubscription, hasUsedFreeSession, onBookingSuccess }: MentorBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  if (!mentor) return null;

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const availableTimes = (mentor.availability && mentor.availability[formattedDate]) ? mentor.availability[formattedDate] : [];

  const handleConfirm = () => {
    if (mentor && selectedDate && selectedTime) {
      onBookingSuccess(mentor.name, selectedDate, selectedTime);
      onOpenChange(false);
    }
  };

  const isDisabled = !isLoggedIn || !hasSubscription;
  let tooltipContent = null;
  if (!isLoggedIn) {
    tooltipContent = <p>Please login to book a meeting</p>;
  } else if (!hasSubscription) {
    tooltipContent = <p>Subscribe to a plan to book a meeting</p>;
  }

  const isFreeSession = !hasUsedFreeSession;

  const confirmButton = (
    <Button size="lg" disabled={!selectedTime || isDisabled} onClick={handleConfirm}>
      <Check className="mr-2 h-5 w-5" />
      Confirm Booking
    </Button>
  );

  return (
    <Dialog open={!!mentor} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6">
          <DialogTitle className="text-3xl font-bold font-headline">Schedule a Meeting</DialogTitle>
          <DialogDescription>
            Book a one-on-one session with {mentor.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-grow min-h-0 gap-8 mt-4 px-6 pb-6">
          {/* Left Panel: Mentor Info & Calendar */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={mentor.avatar} alt={mentor.name} data-ai-hint={mentor.hint}/>
                  <AvatarFallback>{mentor.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{mentor.name}</h3>
                  <p className="text-muted-foreground">{mentor.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {isFreeSession ? (
                      <>
                        <span className="text-xl font-semibold">Free</span>
                        <Badge variant="secondary">First Session Free!</Badge>
                      </>
                    ) : (
                      <>
                        <IndianRupee className="h-5 w-5 text-primary" />
                        <span className="text-xl font-semibold">{mentor.hourlyRate}</span>
                        <span className="text-muted-foreground">/ hour</span>
                      </>
                    )}
                  </div>
                </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" /> Select a Date</h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                className="rounded-md border bg-card/50"
                disabled={(date) => {
                    const formatted = format(date, 'yyyy-MM-dd');
                    return !mentor.availability[formatted] || mentor.availability[formatted].length === 0;
                }}
              />
            </div>
          </div>

          {/* Right Panel: Time Slots & Confirmation */}
          <div className="w-full md:w-1/2 flex flex-col">
            <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Select a Time</h4>
            {selectedDate ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow content-start">
                  {availableTimes.length > 0 ? (
                    availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        className={cn(selectedTime === time && "bg-primary text-primary-foreground")}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))
                  ) : (
                    <p className="text-muted-foreground col-span-full text-center py-8">No available slots on this day. Please select another date.</p>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please select a date to see available times.</p>
              </div>
            )}
            
            <DialogFooter className="mt-auto pt-6">
                <div className="text-center w-full">
                    {isDisabled ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{confirmButton}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {tooltipContent}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    ) : (
                        confirmButton
                    )}
                </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
