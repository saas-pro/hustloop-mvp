
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MSMEChallenge } from './msmes';
import { Handshake, Target, Check, User, Workflow, IndianRupee, Timer, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthContext';

interface MSMECollaborationDetailsProps {
  collaboration: MSMEChallenge | null;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
}

export default function MSMECollaborationDetails({
  collaboration,
  onOpenChange,
  isLoggedIn,
  hasSubscription: hasSubscriptionProp, // Keep prop for compatibility but don't use it
}: MSMECollaborationDetailsProps) {
  const { userRole, hasSubscription } = useAuth(); // Get real-time subscription status

  if (!collaboration) return null;
  const isOtherUsers = ["organisation", "incubator", "mentor"].some(role =>
    userRole?.includes(role)
  );
  const isDisabled = !isLoggedIn || !hasSubscription || isOtherUsers;
  let tooltipContent = null;
  if (!isLoggedIn) {
    tooltipContent = <p>Please login to connect with MSMEs</p>;
  } else if (!hasSubscription) {
    tooltipContent = <p>Subscribe to a plan to connect with MSMEs</p>;
  }

  const connectButton = (
    <Button
      size="lg"
      className="bg-accent hover:bg-accent/90 text-accent-foreground"
    >
      <Handshake className="mr-2 h-5 w-5" /> Apply Now
    </Button>
  );
  return (
    <Dialog open={!!collaboration} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6">
          <div className='flex items-center gap-4'>
            <Image src="https://api.hustloop.com/static/images/building.png" alt={`${collaboration.challenge_type} logo`} width={80} height={80} className="rounded-lg" />
            <div>
              <DialogTitle className="text-3xl font-bold font-headline">{collaboration.title}</DialogTitle>
              <DialogDescription>
                Collaboration opportunity in the {collaboration.company_name} sector.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow mt-4 px-6">
          <div className="space-y-12">

            <div>
              <h3 className="text-2xl font-bold mb-4 font-headline">About The Challenge</h3>
              <p className="text-muted-foreground">{collaboration.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="items-center">
                  <Workflow className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-4xl font-bold">{collaboration.stage}</CardTitle>
                  <p className="text-sm text-muted-foreground">Challenge Stages</p>
                </CardHeader>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="items-center">
                  <Timer className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-4xl font-bold">
                    {new Date(collaboration.end_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">End Date</p>
                </CardHeader>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="items-center">
                  <IndianRupee className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-2xl font-bold">{collaboration.reward_amount}</CardTitle>
                  <p className="text-sm text-muted-foreground">Reward Amount</p>
                </CardHeader>
              </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 font-headline">Mission</h3>
                <ul className="space-y-2">
                  {Array.isArray(collaboration.scope) && collaboration.scope.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4 font-headline">Who Can Participate</h3>
                <p className="text-muted-foreground">{collaboration.looking_for}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-2xl font-bold mb-4 font-headline">Primary Contact</h3>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6 flex items-center gap-4">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">{collaboration.contact_name}</p>
                    <p className="text-sm text-muted-foreground">{collaboration.contact_role}</p>
                  </div>
                </CardContent>
              </Card>
            </div>


            {isOtherUsers ?
              <div className="text-center bg-card/50 rounded-lg my-12 py-10">
                <h2 className="text-3xl font-bold mb-4 font-headline">
                  Ready to Solve This Challenge?
                </h2>
                <p className="max-w-2xl mx-auto text-muted-foreground mb-8">
                  Login as Founder to Solve this Problem
                </p>
              </div>

              : <div className="text-center bg-card/50 rounded-lg my-12 py-10">
                <h2 className="text-3xl font-bold mb-4 font-headline">
                  Ready to Solve This Challenge?
                </h2>
                <p className="max-w-2xl mx-auto text-muted-foreground mb-8">
                  Submit your innovative solution and get a chance to win exciting rewards and partnerships.
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{connectButton}</span>
                    </TooltipTrigger>
                    {isDisabled && <TooltipContent>{tooltipContent}</TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </div>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
