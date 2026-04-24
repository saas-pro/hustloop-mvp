
'use client';

import { useState } from 'react';
import type { EducationProgram as Program, EducationSession as Session } from '@/app/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface EducationBookingModalProps {
  program: Program | null;
  onOpenChange: () => void;
  onApplicationSuccess: (programTitle: string, session: Session) => void;
}

export default function EducationBookingModal({ program, onOpenChange, onApplicationSuccess }: EducationBookingModalProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  if (!program) return null;

  const handleConfirm = () => {
    if (program && selectedSession) {
      onApplicationSuccess(program.title, selectedSession);
      onOpenChange();
    }
  };

  return (
    <Dialog open={!!program} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline">{program.title}</DialogTitle>
          <DialogDescription>
            Please select your preferred session to complete your application.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 my-4">
            <div>
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" /> Available Sessions</h4>
              <p className="text-sm text-muted-foreground">Choose one of the following sessions to attend.</p>
            </div>
            
            <div className="space-y-3">
                {program.sessions.map((session, index) => (
                    <Card 
                        key={index}
                        onClick={() => setSelectedSession(session)}
                        className={cn(
                            "cursor-pointer transition-all border-2",
                            selectedSession === session 
                                ? "border-primary bg-primary/10" 
                                : "hover:bg-muted/50"
                        )}
                    >
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{session.language} Session</p>
                                <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4" /> {session.date}, {session.time}
                                </p>
                            </div>
                            {selectedSession === session && <Check className="h-6 w-6 text-primary"/>}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        <DialogFooter className="mt-auto pt-6">
            <Button size="lg" disabled={!selectedSession} onClick={handleConfirm} className="w-full">
                <Check className="mr-2 h-5 w-5" />
                Confirm Application
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
