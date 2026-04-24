
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CorporateChallengeDetails from "./corporate-challenge-details";
import MSMECollaborationDetails from "./msme-collaboration-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Lock, Terminal, X } from "lucide-react";
import type { View } from "@/app/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { API_BASE_URL } from "@/lib/api";
import { MarkdownViewer } from "../ui/markdownViewer";
import { useChallengeProgress } from "../ui/useChallengeProgress";
import { Progress } from "../ui/progress";
import { CorporateChallengeCard } from "./CorporateChallengeCard";
import { MSMEChallengeCard } from "./MSMEChallengeCard";
import { GovermentChallengeCard } from "./GovernmentChallengeCard";


export type CorporateChallenge = {
  id: string;
  title: string;
  description: string;
  affiliated_by: string | null;
  submission_count: number;
  reward_amount: number;
  reward_min: number;
  reward_max: number;
  challenge_type: string;
  start_date: string;
  end_date: string;
  sector: string;
  stage: string;
  technology_area: string;
  contact_name: string;
  contact_role: string;
  created_at: string;
  looking_for: string;
  status: string;
  company_name: string;
  company_sector: string;
  company_description: string;
  website_url: string;
  linkedin_url: string;
  scope: string;
  x_url: string;
  stop_date: string | null;
  logo_url: string;
  extended_end_date?: string | null;
  attachments: [];
  qa_count: number;
  company_avatar: string | null;
};

export type MSMEChallenge = {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  reward_min: number;
  reward_max: number;
  submission_count: number;
  challenge_type: string;
  start_date: string;
  end_date: string;
  sector: string;
  stage: string;
  technology_area: string;
  contact_name: string;
  contact_role: string;
  created_at: string;
  looking_for: string;
  status: string;
  company_name: string;
  company_sector: string;
  company_description: string;
  website_url: string;
  linkedin_url: string;
  scope: string;
  x_url: string;
  logo_url: string;
  extended_end_date?: string | null;
  stop_date: string | null;
  attachments: [];

};
export type Governmentchallenges = {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  reward_min: number;
  submission_count: number;
  reward_max: number;
  challenge_type: string;
  start_date: string;
  end_date: string;
  sector: string;
  stage: string;
  technology_area: string;
  contact_name: string;
  contact_role: string;
  created_at: string;
  looking_for: string;
  status: string;
  company_name: string;
  company_sector: string;
  company_description: string;
  website_url: string;
  linkedin_url: string;
  scope: string;
  x_url: string;
  logo_url: string;
  extended_end_date?: string | null;
  stop_date: string | null;
  attachments: [];
};

interface MsmesViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  setActiveView: (view: View) => void;
}


const LoginPrompt = ({ setActiveView, contentType }: { setActiveView: (view: View) => void, contentType: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <Lock className="h-16 w-16 text-accent mb-6" />
    <h3 className="text-2xl font-bold mb-2">Access required</h3>
    <p className="max-w-md mx-auto text-muted-foreground mb-6">
      Please log in or sign up to view available {contentType}.
    </p>
    <div className="flex gap-4">
      <Button onClick={() => setActiveView('login')}>Login</Button>
      <Button onClick={() => setActiveView('signup')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        Sign Up
      </Button>
    </div>
  </div>
);


const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[...Array(6)].map((_, index) => (
      <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
        <CardFooter className="flex-col items-start space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    ))}
  </div>
);


export default function MsmesView({ isOpen, onOpenChange, isLoggedIn, hasSubscription, setActiveView }: MsmesViewProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<CorporateChallenge | null>(null);
  const [selectedCollaboration, setSelectedCollaboration] = useState<MSMEChallenge | null>(null);
  const [selectedGovernmentchallenges, setSelectedGovernmentchallenges] = useState<Governmentchallenges | null>(null);
  const { toast } = useToast();

  const [corporateChallenges, setCorporateChallenges] = useState<CorporateChallenge[]>([]);
  const [msmeCollaborations, setMsmeCollaborations] = useState<MSMEChallenge[]>([]);
  const [Governmentchallenges, setGovernmentchallenges] = useState<Governmentchallenges[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!isOpen) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const apiBaseUrl = API_BASE_URL;

        const [corporateRes, msmeRes, governmentRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/get-collaboration?challenge_type=corporate`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }),
          fetch(`${apiBaseUrl}/api/get-collaboration?challenge_type=msme`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }),
          fetch(`${apiBaseUrl}/api/get-collaboration?challenge_type=government`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })
        ]);

        if (!corporateRes.ok || !msmeRes.ok || !governmentRes.ok) {
          throw new Error("Failed to fetch challenges");
        }

        const corporateData = await corporateRes.json();
        const msmeData = await msmeRes.json();
        const governmentData = await governmentRes.json();

        setCorporateChallenges(corporateData.message.collaborations || []);
        setMsmeCollaborations(msmeData.message.collaborations || []);
        setGovernmentchallenges(governmentData.message.collaborations || []);

      } catch (err: any) {
        setError(err.message || "Something went wrong");
        toast({
          variant: "destructive",
          title: "Failed to load challenges",
          description: err.message || "Unknown error"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [isOpen, toast]);

  const handleViewDetails = (type: 'CorporateChallenges' | 'MSMECollaboration' | 'GovernmentChallenges', item: any) => {
    if (type === 'CorporateChallenges') setSelectedChallenge(item);
    if (type === 'MSMECollaboration') setSelectedCollaboration(item);
    if (type === 'GovernmentChallenges') setSelectedGovernmentchallenges(item);
  };

  const [allowAccess, setAllowAccess] = useState(false);

  useEffect(() => {
    const fromMarketplace = localStorage.getItem("fromMarketplace");
    if (fromMarketplace === "true") {
      setAllowAccess(true);
      localStorage.removeItem("fromMarketplace");
    }
  }, []);

  const renderContent = () => {

    if (!allowAccess && !isLoggedIn) {
      return (
        <div className="flex-grow flex items-center justify-center px-6 pb-6">
          <LoginPrompt setActiveView={setActiveView} contentType="challenges and collaborations" />
        </div>
      );
    }

    if (isLoading) {
      return (
        <Tabs defaultValue="CorporateChallenges" className="flex flex-col flex-grow min-h-0 px-6 pb-6">
          <TabsList className="grid w-full grid-cols-3 h-fit">
            <TabsTrigger value="CorporateChallenges">Corporate&apos;s</TabsTrigger>
            <TabsTrigger value="MSMECollaboration">MSME&apos;s</TabsTrigger>
            <TabsTrigger value="Governmentchallenges">Government&apos;s</TabsTrigger>
          </TabsList>
          <TabsContent value="CorporateChallenges" className="mt-4 flex-1 overflow-y-auto pr-4">
            <LoadingSkeleton />
          </TabsContent>
          <TabsContent value="MSMECollaboration" className="mt-4 flex-1 overflow-y-auto pr-4">
            <LoadingSkeleton />
          </TabsContent>
          <TabsContent value="Governmentchallenges" className="mt-4 flex-1 overflow-y-auto pr-4">
            <LoadingSkeleton />
          </TabsContent>
        </Tabs>
      );
    }

    if (error) {
      return (
        <div className="flex-grow flex items-center justify-center px-6 pb-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <Tabs defaultValue="challenges" className="flex flex-col flex-grow min-h-0 px-6 pb-6">
        <TabsList className="grid w-full h-fit grid-cols-3">
          <TabsTrigger value="CorporateChallenges">Corporate&apos;s</TabsTrigger>
          <TabsTrigger value="MSMECollaboration">MSME&apos;s</TabsTrigger>
          <TabsTrigger value="Governmentchallenges">Government&apos;s</TabsTrigger>
        </TabsList>
        <TabsContent value="CorporateChallenges" className="mt-4 flex-1 overflow-x-hidden pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {corporateChallenges?.map((challenge, index) =>
              <CorporateChallengeCard
                key={index}
                challenge={challenge}
                onViewDetails={handleViewDetails}
              />
            )}
          </div>
          <>
            {corporateChallenges?.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2 font-headline">
                  No Challenges Present at the Moment
                </h2>
                <p className="text-muted-foreground">
                  Please check back later — new challenges will appear here soon.
                </p>
              </div>
            )}
          </>
        </TabsContent>
        <TabsContent value="MSMECollaboration" className="mt-4 flex-1 overflow-x-hidden pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {msmeCollaborations?.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2 font-headline">
                  No Challenges Present at the Moment
                </h2>
                <p className="text-muted-foreground">
                  Please check back later — new challenges will appear here soon.
                </p>
              </div>
            ) : msmeCollaborations?.map((challenge, index) =>
              <CorporateChallengeCard
                key={index}
                challenge={challenge}
                onViewDetails={handleViewDetails}

              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="Governmentchallenges" className="mt-4 flex-1 overflow-x-hidden pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {Governmentchallenges?.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2 font-headline">
                  No Challenges Present at the Moment
                </h2>
                <p className="text-muted-foreground">
                  Please check back later — new challenges will appear here soon.
                </p>
              </div>
            ) : Governmentchallenges?.map((challenge, index) =>
              <CorporateChallengeCard
                key={index}
                challenge={challenge}
                onViewDetails={handleViewDetails}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <>
      <Dialog open={isOpen}>
        <DialogContent
          hideClose={true}
          className="sm:max-w-5xl h-[90vh] flex flex-col p-0 rounded-lg">
          <DialogHeader className="p-6">
            <DialogTitle className="text-3xl font-bold text-center font-headline">Innovation &amp; Growth Opportunities</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 disabled:pointer-events-none hover:!bg-transparent"
              onClick={(e) => {
                e.stopPropagation();  // Add this line
                onOpenChange(false);
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            <DialogDescription className="text-center">
              <span className="text-accent">&quot;Empowering MSMEs for Success&quot;</span>
              <span className="text-center mx-auto hidden md:block">
                Collaborate on MSME, corporate and government incentive challenges for rewards and growth. Innovators, entrepreneurs, and experts - find your match.
              </span>
            </DialogDescription>
          </DialogHeader>

          {renderContent()}

        </DialogContent>
      </Dialog>
      <CorporateChallengeDetails
        challenge={selectedChallenge}
        onOpenChange={(isOpen) => !isOpen && setSelectedChallenge(null)}
        isLoggedIn={isLoggedIn}
        hasSubscription={hasSubscription}
        setActiveView={setActiveView}
      />
    </>
  );
}


