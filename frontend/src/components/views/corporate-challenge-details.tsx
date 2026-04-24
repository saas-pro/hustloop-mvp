'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow, IndianRupee, Rocket, User, Timer, AlertCircle, Check, Globe, Twitter, Linkedin, HelpCircle, UserCircle, MessageSquare, Book, Award, Lock, FileText, Trophy, Star, Medal, Users, Clock, MoreVertical, Pencil, Trash2, Mail, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Image from 'next/image';
import { SolutionSubmissionForm } from './solution-submission-form';
import { MarkdownViewer } from '../ui/markdownViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import VerticalTimeline from '../ui/verticalTimeLine';
import { useChallengeProgress } from '../ui/useChallengeProgress';
import { QAForum } from '../ui/QAForum';
import { View } from '@/app/types';
import { API_BASE_URL } from '@/lib/api';
import { Input } from '../ui/input';
import { Table } from '../ui/table';
import { Badge } from '../ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { LoadingButton } from "../ui/loading-button";
import TimelineCounter from '../ui/timeline-counter';
import { Skeleton } from '../ui/skeleton';
import { AnnouncementDialog } from './AnnouncementDialog';
import CircularText from '@/components/CircularText';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { string } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';

interface CorporateChallengeDetailsProps {
  challenge: CorporateChallenge | null;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  setActiveView: (view: View) => void;
}

interface CorporateChallenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  submission_count: number;
  reward_min: number;
  reward_max: number;
  challenge_type: string;
  affiliated_by: string | null;
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
  attachments?: []
  qa_count: number;
}

type hallOfFame = {
  contactName: string;
  points: number;
  state: string;
  status: string;
  rewards: string;
}

type TimelineData = {
  application_started: string;
  application_ended: string;
  extended_end_date: string | null;
  review_started: string;
  review_ended: string;
  screening_started: string;
  screening_ended: string;
  challenge_close: boolean | string;
  status: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  attachments: string[];
  createdBy: string;
  createdAt: string;
}

const sampleFaqs = [
  {
    question: "Who is eligible to participate?",
    answer: "This challenge is open to all registered startups, students, and innovators who meet the criteria specified in the 'Who Can Participate' section."
  },
  {
    question: "Can I submit as a team?",
    answer: "Yes, you can submit as an individual or form a team of up to 5 members. Make sure to list all team members after the submission process in your dashboard."
  },
  {
    question: "What is the format for submission?",
    answer: "Submissions should include a detailed description of your solution, key features, benefits, and an implementation plan. You can also attach supporting documents (PDF/DOCX)."
  },
  {
    question: "How will the winners be selected?",
    answer: "Winners will be selected based on innovation, feasibility, impact, and alignment with the challenge problem statement. A panel of experts will review all submissions."
  },
  {
    question: "Can I update my submission after submitting?",
    answer: "Yes, you may revise your submission until the official deadline. After the cutoff time, no further edits or resubmissions will be allowed. Ensure your final version is complete and accurate."
  },
  {
    question: "Will participants receive feedback?",
    answer: "Feedback may be provided depending on reviewer availability. While detailed comments are not guaranteed, participants often receive summary insights. Additional guidance may be shared during review phases."
  },
  {
    question: "Are there any restrictions on solution type?",
    answer: "Solutions must align with the challenge theme and follow the provided guidelines. Both technical and non-technical solutions are welcome. Any content violating safety or legal standards will be disqualified."
  },
  {
    question: "How will I know if my submission was received?",
    answer: "Once submitted, you will receive a confirmation email with your submission ID. You can also verify it in your dashboard at any time. If you don’t receive confirmation, contact support."
  },
  {
    question: "What happens if the deadline is extended?",
    answer: "If the deadline changes, all registered participants will be notified immediately. The updated schedule will appear on the challenge page. Submissions will be accepted until the new cutoff date."
  },
  {
    question: "Will my submission remain confidential?",
    answer: "All submissions are kept secure and used only for evaluation purposes. Sensitive information will not be shared publicly without permission."
  }
];


export function AccessMessage({ title, message }: { title: string; message: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
}

export default function CorporateChallengeDetails({
  challenge,
  onOpenChange,
  isLoggedIn,
  hasSubscription,
  setActiveView
}: CorporateChallengeDetailsProps) {
  const isMobile = useIsMobile();
  const { progress, daysRemaining } = useChallengeProgress(challenge);
  const [challengeId, setChallengeId] = useState()
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<TimelineData | null>(null);
  const [data, setData] = useState<hallOfFame[]>([]);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [collaborationId, setCollaborationId] = useState<string>("")
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null);
  const [isFetchingAnnouncements, setIsFetchingAnnouncements] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const router = useRouter();
  const handleScrollCapture = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrolled(el.scrollTop > 0);
  };
  const {
    userRole: user_role,
    founderRole: founder_role,
  } = useAuth();
  useEffect(() => {
    if (!challenge) return;

    const getHallOfFame = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hall-of-fame/${challenge.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await res.json();
        setData(data.hallOfFame || []);
      } catch (err) {
        console.error("Failed to fetch hall of fame:", err);
      }
    };

    getHallOfFame();
  }, [challenge]);

  const [isSolutionSubmitted, setIsSolutionSubmitted] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const challengeId = challenge?.id;
        if (!challengeId) return;
        const res = await fetch(`${API_BASE_URL}/api/solution/check/${challengeId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        const { message } = await res.json();
        if (message?.hasSubmitted) {
          setIsSolutionSubmitted(true);
        } else {
          setIsSolutionSubmitted(false);
        }
      } catch (error) {
        console.error("Failed to fetch solution check:", error);
      }
    }
    check();
  }, [challenge?.id]);

  const fetchAnnouncements = useCallback(async () => {
    if (!challenge?.id) return;

    setIsFetchingAnnouncements(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${challenge.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setIsFetchingAnnouncements(false);
    }
  }, [challenge?.id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [challenge, fetchAnnouncements]);

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsAnnouncementDialogOpen(true);
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnouncementId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${deleteAnnouncementId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        toast({
          title: "Announcement Deleted",
          description: "The announcement has been removed.",
        });
        fetchAnnouncements();
        setDeleteAnnouncementId(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete announcement.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting announcement", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting.",
        variant: "destructive",
      });
    }
  };

  const handleAnnouncementDialogClose = (open: boolean) => {
    setIsAnnouncementDialogOpen(open);
    if (!open) {
      setEditingAnnouncement(null);
    }
  };


  useEffect(() => {
    const getEvents = async () => {
      if (!challenge) return;

      const response = await fetch(
        `${API_BASE_URL}/api/collaborations/${challenge.id}/timeline`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();
      setEvents(data.message?.timeline || data.timeline);
    };

    getEvents();
  }, [challenge]);



  useEffect(() => {
    if (!challenge?.id) return;

    fetch(`${API_BASE_URL}/api/announcements/${challenge.id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements || []));
  }, [challenge]);


  const filtered = data.filter((item: any) => {
    const s = search.toLowerCase();
    return (
      item.contactName.toLowerCase().includes(s) ||
      String(item.points).includes(s) ||
      item.district.toLowerCase().includes(s)
    );
  });

  const termsRef = useRef<HTMLDivElement>(null);

  if (!challenge) return null;
  const role = user_role || "";

  const isFounder = role === "founder";

  const isAllowedFounder =
    isFounder && founder_role === "Solve Organisation's challenge";

  const isOtherUsers =
    ["incubator", "mentor", "organisation"].includes(role) ||
    (isFounder && !isAllowedFounder);

  const isDisabled = !isLoggedIn || isOtherUsers;
  let tooltipContent = null;
  if (!isLoggedIn) {
    tooltipContent = <p>Please login to view the problem statement&apos;s</p>;
  } else if (!hasSubscription && isAllowedFounder) {
    tooltipContent = (
      <p>Subscribe to a plan to view and submit the solution</p>
    );
  } else if (isOtherUsers) {
    tooltipContent = (
      <p>{"Solution submission is not allowed for your role."}</p>
    )
  }

  const handleApplyClick = (id: any) => {
    if (!isDisabled) {
      setShowTermsDialog(true);
      setChallengeId(id)
    }
  };

  const handleSubmissionSuccess = () => {
    setShowSubmissionForm(false);
    setIsSolutionSubmitted(true);
  };

  const handleCancelSubmission = () => {
    setShowSubmissionForm(false);
  };

  const handleAgreeAndProceed = () => {
    sessionStorage.setItem('hasAgreedToTerms', 'true');
    setHasAgreed(true);
    setShowTermsDialog(false);
    setShowSubmissionForm(true);
  };

  const handleScroll = () => {
    if (!termsRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setScrolledToEnd(true);
    }
  };

  const winners = filtered.filter(item => item.status === "winner");
  const scored = filtered.filter(item => item.points > 0 && item.status !== "winner");
  const zeroPoints = filtered.filter(item => item.points === 0 && item.status !== "winner");


  const isChallengeExpiredOrStopped = challenge.status === "expired" || challenge.status === "stopped";
  const attachments = Array.isArray(challenge?.attachments)
    ? challenge.attachments
    : JSON.parse(challenge?.attachments || "[]");
  return (
    <Dialog open={!!challenge} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-full md:w-[90vw] md:max-w-[90vw] flex flex-col p-0 rounded-lg">
        <DialogHeader className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-[60px] w-[60px] rounded-lg">
              <AvatarImage src={challenge.logo_url} alt={challenge.company_name} />
              <AvatarFallback className="rounded-lg font-headline bg-accent/80 text-current text-xl font-bold flex items-center justify-center border border-white/20">
                {challenge.company_name ? challenge.company_name[0] : "C"}
              </AvatarFallback>
            </Avatar>
            <div>

              <DialogTitle className="text-3xl font-bold font-headline text-left">
                {challenge.company_name ? (
                  <span className="text-black blur-sm">{challenge.company_name}</span>
                ) : ''}
              </DialogTitle>
              <div className="text-left flex flex-col gap-2">
                <DialogDescription className="line-clamp-3">
                  {challenge.company_description}
                </DialogDescription>
                <p className="text-sm text-muted-foreground">
                  A challenge by{' '}
                  {challenge.company_name ? (
                    <span className="blur-sm">{challenge.company_name}</span>
                  ) : ''}{' '}
                  {challenge.affiliated_by && (
                    <span className="text-muted-foreground font-bold font-headline">
                      (Affiliated By {challenge.affiliated_by})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full px-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-fit">
            <TabsTrigger value="summary" disabled={challenge.status === "stopped" || challenge.status === "expired"} className={`${(challenge.status !== "active" ? 'font-normal' : '')}`}>Summary</TabsTrigger>
            <TabsTrigger value="timeline" disabled={challenge.status === "stopped"} className={`${(challenge.status !== "active" ? 'font-normal' : '')}`}>Timeline</TabsTrigger>
            <TabsTrigger value="announcement">
              <span className="flex items-center gap-2">
                Announcements
                {announcements && announcements.length >= 0 && challenge.status !== "stopped" && (
                  <span className="inline-flex items-center font-headline justify-center h-5 w-5 font-semibold rounded-full bg-primary text-primary-foreground">
                    {announcements.length}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="hof">Hall of Fame</TabsTrigger>
            <TabsTrigger value="q/a" disabled={challenge.status === "stopped" || challenge.status === "expired"} className={`${(challenge.status !== "active" ? 'font-normal' : '')}`}><span className="flex items-center gap-2"> Q/A {challenge.qa_count > 0 && <span className="inline-flex items-center justify-center h-5 w-5 font-semibold rounded-full bg-primary text-primary-foreground">
              {challenge.qa_count}
            </span>}</span></TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          {/* <ScrollArea className="flex-grow mt-4 h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]"> */}

          <div className="flex flex-col w-full mt-4">
            <TabsContent value="summary" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
              <div className="space-y-8">

                {isChallengeExpiredOrStopped && (
                  <div className="w-full bg-red-100 border-l-8 border-red-600 p-5 rounded text-red-900 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="text-red-600 text-xl">❗</div>
                      <div>
                        <h2 className="text-lg font-bold mb-1">
                          {challenge.status === "stopped" && "This challenge has been Stopped"}
                          {challenge.status === "expired" && "This challenge has been Ended"}
                        </h2>

                        <p className="text-sm leading-relaxed mb-2">
                          All activity related to this challenge should be halted until further notice.
                        </p>

                        <p className="text-sm leading-relaxed mb-2">
                          Effective immediately, this challenge is no longer accepting submissions.
                          Our team is reviewing operational and safety requirements and will notify you
                          when further updates are available. We appreciate your patience.
                        </p>

                        {challenge.status === "expired" && (
                          <p className="text-sm leading-relaxed mb-2">
                            Explore other challenges to continue showcasing your skills.
                          </p>
                        )}


                        <p className="text-sm leading-relaxed mb-4">
                          If you have any questions, please reach out to support or email us at
                          <a href="mailto:support@hustloop.com" className="font-semibold underline ml-1">
                            support[@]hustloop.com
                          </a>
                        </p>

                        {challenge.stop_date && (
                          <p className="text-xs font-semibold text-red-700">
                            Stopped on {new Date(challenge.stop_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/5 p-6 md:p-8">
                  {/* Animated gradient border effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
                    {/* Left side - Title section */}
                    <div className="flex gap-4 items-start flex-1 max-w-[100%] md:max-w-[65%] pr-4">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                        <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
                          <Award className="h-7 w-7 text-white" />
                        </div>
                      </div>

                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
                            Challenge Title
                          </h2>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text break-words">
                          {challenge.title}
                        </h1>
                      </div>
                    </div>

                    {/* Right side - Timer */}
                    <div className='flex items-center justify-center md:justify-end w-full md:w-auto flex-shrink-0'>
                      <div className="relative">
                        <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-full" />
                        <div className="relative top-0 right-0 md:top-[3.2rem] md:right-[2rem]">
                          <TimelineCounter
                            endDate={challenge?.end_date}
                            extendedEndDate={challenge.extended_end_date}
                            status={challenge.status}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                </div>


                <div>
                  <h3 className="text-2xl font-bold mb-4">About The Challenge</h3>
                  <MarkdownViewer content={challenge.description} />
                </div>

                {attachments?.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Attachments</h2>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 ${({ 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' } as Record<number, string>)[Math.min(attachments.length, 5)] ?? 'lg:grid-cols-5'
                      }`}>
                      {attachments.map((fileUrl: string, index: number) => {
                        const fileName = fileUrl.split("/").pop();
                        return (
                          <div className="text-sm bg-accent/50 hover:bg-accent p-3 rounded-md flex items-center" key={index}>
                            <a
                              key={index}
                              href={fileUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:text-primary/80 break-all w-full"
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{fileName}</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <Card className="bg-card/50 backdrop-blur-sm border">
                    <CardHeader className="items-center">
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-3xl font-bold">{challenge?.submission_count}</CardTitle>
                      <p className="text-sm text-muted-foreground">Solutions Submitted</p>
                    </CardHeader>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border">
                    <CardHeader className="items-center">
                      <Timer className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-2xl font-bold">
                        {new Date(challenge.extended_end_date || challenge.end_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {challenge.extended_end_date ? "End Date Extended" : "End Date"}
                      </p>
                    </CardHeader>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border">
                    <CardHeader className="items-center">
                      <IndianRupee className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-2xl font-bold">
                        {challenge.reward_amount ??
                          `${challenge.reward_min} - ${challenge.reward_max}`}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Reward Amount</p>
                    </CardHeader>
                  </Card>
                </div>
                <Separator />
                <div>
                  <h3 className="text-xl font-semibold mb-3">Contact Information</h3>
                  <div className={isMobile ? "flex justify-center flex-wrap gap-4 py-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}>
                    {/* Email Contact Card */}
                    <Card className={cn("bg-muted/30 border hover:border-primary/50 transition-all duration-300", isMobile ? "rounded-full p-2" : "")}>
                      <CardHeader className={isMobile ? "p-0" : "pb-3"}>
                        <div className="flex items-center gap-2">
                          <a href="mailto:boopathi.s@hustloop.com" className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold hover:bg-primary hover:text-white transition-colors">
                            B
                          </a>
                          {!isMobile && (
                            <div>
                              <CardTitle className="text-base">Boopathi S</CardTitle>
                              <CardDescription className="text-xs">Founder and CEO</CardDescription>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {!isMobile && (
                        <CardContent className="pt-0">
                          <a
                            href="mailto:boopathi.s@hustloop.com"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group break-all"
                          >
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="group-hover:underline">boopathi s</span>
                          </a>
                        </CardContent>
                      )}
                    </Card>

                    {/* Social Media Card */}
                    {/* Instagram Card */}
                    <Card className={cn("bg-muted/30 border hover:border-primary/50 transition-all duration-300", isMobile ? "rounded-full p-2" : "")}>
                      <CardHeader className={isMobile ? "p-0" : "pb-3"}>
                        <div className="flex items-center gap-2">
                          <a
                            href="https://instagram.com/hustloop_official"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                          </a>
                          {!isMobile && (
                            <div>
                              <CardTitle className="text-base">Instagram</CardTitle>
                              <CardDescription className="text-xs">Follow us</CardDescription>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {!isMobile && (
                        <CardContent className="pt-0">
                          <a
                            href="https://instagram.com/hustloop_official"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                          >
                            <span className="group-hover:underline">@hustloop_official</span>
                          </a>
                        </CardContent>
                      )}
                    </Card>

                    {/* LinkedIn Card */}
                    <Card className={cn("bg-muted/30 border hover:border-primary/50 transition-all duration-300", isMobile ? "rounded-full p-2" : "")}>
                      <CardHeader className={isMobile ? "p-0" : "pb-3"}>
                        <div className="flex items-center gap-2">
                          <a
                            href="https://linkedin.com/company/hustloop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 rounded-full bg-[#0077B5] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                          {!isMobile && (
                            <div>
                              <CardTitle className="text-base">LinkedIn</CardTitle>
                              <CardDescription className="text-xs">Connect with us</CardDescription>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {!isMobile && (
                        <CardContent className="pt-0">
                          <a
                            href="https://linkedin.com/company/hustloop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                          >
                            <span className="group-hover:underline">@hustloop</span>
                          </a>
                        </CardContent>
                      )}
                    </Card>

                    {/* X (Twitter) Card */}
                    <Card className={cn("bg-muted/30 border hover:border-primary/50 transition-all duration-300", isMobile ? "rounded-full p-2" : "")}>
                      <CardHeader className={isMobile ? "p-0" : "pb-3"}>
                        <div className="flex items-center gap-2">
                          <a
                            href="https://x.com/hustloop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black hover:opacity-80 transition-opacity"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </a>
                          {!isMobile && (
                            <div>
                              <CardTitle className="text-base">X (Twitter)</CardTitle>
                              <CardDescription className="text-xs">Follow us</CardDescription>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {!isMobile && (
                        <CardContent className="pt-0">
                          <a
                            href="https://x.com/hustloop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                          >
                            <span className="group-hover:underline">@hustloop</span>
                          </a>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                </div>

                <div className="relative text-center rounded-lg my-12 py-10">

                  {
                    isChallengeExpiredOrStopped ? (
                      <div className="w-full text-left bg-red-100 border-l-8 border-red-600 p-5 rounded text-red-900 shadow-sm">
                        <div className="flex items-start space-x-3">
                          <div className="text-red-600 text-xl">❗</div>
                          <div>
                            <h2 className="text-lg font-bold mb-1">
                              {challenge.status === "stopped" && "This challenge has been Stopped"}
                              {challenge.status === "expired" && "This challenge has been Ended"}
                            </h2>

                            <p className="text-sm leading-relaxed mb-2">
                              All activity related to this challenge should be halted until further notice.
                            </p>

                            <p className="text-sm leading-relaxed mb-2">
                              Effective immediately, this challenge is no longer accepting submissions.
                              Our team is reviewing operational and safety requirements and will notify you
                              when further updates are available. We appreciate your patience.
                            </p>

                            {challenge.status === "expired" && (
                              <p className="text-sm leading-relaxed mb-2">
                                Explore other challenges to continue showcasing your skills.
                              </p>
                            )}


                            <p className="text-sm leading-relaxed mb-4">
                              If you have any questions, please reach out to support or email us at
                              <a href="mailto:support@hustloop.com" className="font-semibold underline ml-1">
                                support[@]hustloop.com
                              </a>
                            </p>

                            {challenge.stop_date && (
                              <p className="text-xs font-semibold text-red-700">
                                Stopped on {new Date(challenge.stop_date).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-3xl font-bold mb-4 font-headline">
                          Ready to Solve This Challenge?
                        </h2>

                        <p className="max-w-2xl mx-auto text-muted-foreground mb-8">
                          Submit breakthrough solutions to real challenges and unlock rewards and real-world adoption.
                        </p>
                      </>
                    )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          {isChallengeExpiredOrStopped ? (
                            <div />
                          ) : isOtherUsers ? (
                            <div className="flex gap-4 w-full justify-center">
                              <Button disabled className="bg-gray-400 cursor-not-allowed">
                                Not Allowed
                              </Button>
                            </div>
                          ) : isAllowedFounder || isLoggedIn ? (
                            <Button
                              size="lg"
                              className="bg-accent hover:bg-accent/90 text-accent-foreground"
                              onClick={() => {
                                if (!hasSubscription) {
                                  toast({
                                    title: "Subscription Required",
                                    description: "Please subscribe to a plan to access this challenge",
                                    variant: "default",
                                  });
                                  router.push('/pricing');
                                  return;
                                }
                                if (hasAgreed) {
                                  setShowSubmissionForm(true);
                                } else {
                                  setShowTermsDialog(true);
                                }
                                handleApplyClick(challenge.id)
                              }}
                              disabled={isDisabled || isSolutionSubmitted}
                            >
                              <Rocket className="mr-2 h-5 w-5" />
                              {isSolutionSubmitted ? "Solution Submitted" : "Solve This Challenge"}
                            </Button>
                          ) : (
                            <div className="flex gap-4 w-full justify-center mt-4">
                              <Button onClick={() => setActiveView("login")}>Login</Button>
                              <Button
                                onClick={() => setActiveView("signup")}
                                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                              >
                                Sign Up
                              </Button>
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {isDisabled && !isChallengeExpiredOrStopped && (
                        <TooltipContent side="top" align="center">
                          {tooltipContent}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  {!isChallengeExpiredOrStopped && (
                    <div className="hidden md:block absolute bottom-0 right-0 md:bottom-4 md:right-8 overflow-hidden">
                      <CircularText
                        text="INCENTIVE*CHALLENGES*"
                        spinDuration={10}
                        className="!h-32 !w-32 md:!h-48 md:!w-48"
                        onHover='pause'
                      />
                    </div>
                  )}
                </div>

              </div>
            </TabsContent>
          </div>

          <TabsContent value="timeline" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
            <Card className="p-4 min-h-[400px]">
              <div className="mb-8 text-left m-3">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Clock className="h-8 w-8" />
                  Challenge Timeline
                </h2>
                <p className="text-muted-foreground">
                  Track the progress of the challenge from start to finish.
                </p>
              </div>

              <CardContent className="flex flex-col items-center mt-6">

                {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Access Required</h3>
                    <p className="max-w-xs text-sm">
                      Please log in to view the challenge timeline.
                    </p>
                  </div>
                ) : (
                  <>
                    {events ? (
                      <VerticalTimeline timeline={events} />
                    ) : (
                      <div className="space-y-6 w-full">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              {i < 3 && <Skeleton className="w-0.5 h-16 mt-2" />}
                            </div>
                            <div className="flex-1 space-y-2 pb-8">
                              <Skeleton className="h-6 w-1/3" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="announcement" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
            <Card className="border shadow-sm p-4 min-h-[400px]">
              <div className="mb-8 text-left m-3">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                      <MessageSquare className="h-8 w-8" />
                      Announcements
                    </h2>
                    <p className="text-muted-foreground">
                      Updates and important information for this challenge.
                    </p>
                  </div>
                  {user_role === "admin" && (
                    <Button
                      size="sm"
                      className="w-full md:w-auto mt-3 md:mt-0"
                      onClick={() => {
                        setCollaborationId(challenge.id)
                        setIsAnnouncementDialogOpen(true);
                      }}
                    >
                      + Create Announcement
                    </Button>
                  )}
                </div>

              </div>

              <CardContent className="p-4 pt-0">
                {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Access Required</h3>
                    <p className="max-w-xs text-sm">Please log in to view announcements.</p>
                  </div>
                ) : isFetchingAnnouncements ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-5">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6" />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    {(!announcements || announcements.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <h3 className="text-lg font-semibold text-foreground">No Announcements Yet</h3>
                        <p className="max-w-xs text-sm">
                          Announcements related to this challenge will appear here.
                        </p>
                      </div>
                    )}

                    {announcements?.length > 0 && (
                      <div className="space-y-4">
                        {announcements.map((a) => (
                          <Card
                            key={a.id}
                            className="group p-5 border shadow-sm hover:shadow-lg 
                  transition-all duration-300 rounded-xl relative
                  hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                  {a.type === "alert" && <span className="text-red-500">⚠️</span>}
                                  {a.type === "update" && <span className="text-blue-500">📢</span>}
                                  {a.type === "deadline" && <span className="text-orange-500">⏳</span>}
                                  {a.type === "result" && <span className="text-green-500">🏆</span>}
                                  {a.type === "general" && <span className="text-primary">📝</span>}
                                  {a.title}
                                </h3>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className='hidden md:flex items-center gap-2'>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs capitalize px-3 py-1 rounded-full"
                                  >
                                    {a.type}
                                  </Badge>

                                  {a.createdBy && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-3 py-1 rounded-full"
                                    >
                                      {a.createdBy}
                                    </Badge>
                                  )}
                                </div>

                                {user_role === "admin" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => handleEditAnnouncement(a)}
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer text-destructive"
                                        onClick={() => setDeleteAnnouncementId(a.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center mb-2 gap-2 md:hidden">
                              <Badge
                                variant="secondary"
                                className="text-xs capitalize px-3 py-1 rounded-full"
                              >
                                {a.type}
                              </Badge>

                              {a.createdBy && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-3 py-1 rounded-full"
                                >
                                  {a.createdBy}
                                </Badge>
                              )}
                            </div>



                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                              {a.message}
                            </p>

                            {a.attachments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Attachments:
                                </p>

                                <div className="flex gap-2">
                                  📎
                                  {a.attachments.map((url, i) => (
                                    <a
                                      key={i}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-primary font-medium 
                              underline underline-offset-2 transition-all hover:text-primary/70"
                                    >
                                      Attachment {i + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between text-xs text-muted-foreground opacity-80">
                              <span>Posted on {new Date(a.createdAt).toLocaleString()}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="hof" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
            <Card className="border shadow-sm p-4 min-h-[400px]">
              <div className="mb-8 text-left m-3">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Trophy className="h-8 w-8" />
                  Hall of Fame
                </h2>
                <p className="text-muted-foreground">
                  Celebrating the top innovators and contributors
                </p>
              </div>

              {!isLoggedIn ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Access Required</h3>
                  <p className="max-w-xs text-sm">Please log in to view the Hall of Fame and see who&apos;s leading the challenge.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* 1️⃣ Winner Podium Section */}
                  {winners.length > 0 && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 blur-3xl -z-10" />
                      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                        {winners.map((item, index) => (
                          <div
                            key={index}
                            className="relative group w-full max-w-sm"
                          >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                            <div className="relative flex flex-col items-center p-6 bg-card rounded-xl border border-yellow-200/50 dark:border-yellow-900/50 shadow-xl">
                              <div className="absolute -top-5">
                                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full shadow-lg flex items-center gap-2 font-bold text-sm">
                                  <Trophy className="h-4 w-4" />
                                  WINNER
                                </div>
                              </div>

                              <div
                                className="h-24 w-24 rounded-full border-4 border-yellow-100 dark:border-yellow-900/30 flex items-center justify-center text-3xl font-bold text-white shadow-inner mb-4 mt-4"
                                style={(() => {
                                  const name = item.contactName || "?";
                                  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                  const color1 = `hsl(${hash % 360}, 70%, 50%)`;
                                  const color2 = `hsl(${(hash + 120) % 360}, 70%, 50%)`;
                                  return { background: `linear-gradient(135deg, ${color1}, ${color2})` };
                                })()}
                              >
                                {item.contactName ? item.contactName.charAt(0).toUpperCase() : "?"}
                              </div>

                              <h3 className="text-xl font-bold text-center mb-1">{item.contactName}</h3>
                              <p className="text-sm text-muted-foreground mb-4">{item.state}</p>

                              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/10 px-4 py-2 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-bold text-yellow-700 dark:text-yellow-400">{item.points} Points</span>

                              </div>
                              <span className="font-bold text-yellow-700 dark:text-yellow-400 mt-4">₹ {item.rewards} has been Rewarded</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2️⃣ Leaderboard Section */}
                  {scored.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Medal className="h-5 w-5 text-primary" />
                        Top Performers
                      </h3>
                      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[100px]">Rank</TableHead>
                                <TableHead>Participant</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scored.map((item, index) => (
                                <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-medium text-muted-foreground">
                                    #{index + 1 + winners.length}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-9 w-9 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-sm"
                                        style={(() => {
                                          const name = item.contactName || "?";
                                          const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                          const color1 = `hsl(${hash % 360}, 70%, 50%)`;
                                          const color2 = `hsl(${(hash + 120) % 360}, 70%, 50%)`;
                                          return { background: `linear-gradient(135deg, ${color1}, ${color2})` };
                                        })()}
                                      >
                                        {item.contactName ? item.contactName.charAt(0).toUpperCase() : "?"}
                                      </div>
                                      <span className="font-medium">{item.contactName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                      {item.state}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">
                                    {item.points}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* 3️⃣ Participants Grid */}
                  {zeroPoints.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        All Participants
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {zeroPoints.map((item, index) => (
                          <div
                            key={index}
                            className="group flex flex-col items-center p-4 rounded-xl border bg-card/30 hover:bg-card hover:shadow-md transition-all duration-300"
                          >
                            <div
                              className="h-12 w-12 rounded-full mb-3 text-white flex items-center justify-center text-lg font-bold shadow-sm group-hover:scale-110 transition-transform duration-300"
                              style={(() => {
                                const name = item.contactName || "?";
                                const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                const color1 = `hsl(${hash % 360}, 70%, 50%)`;
                                const color2 = `hsl(${(hash + 120) % 360}, 70%, 50%)`;
                                return { background: `linear-gradient(135deg, ${color1}, ${color2})` };
                              })()}
                            >
                              {item.contactName ? item.contactName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <p className="font-semibold text-sm text-center line-clamp-1 w-full">{item.contactName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.state}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {winners.length === 0 && scored.length === 0 && zeroPoints.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                      <h3 className="text-lg font-semibold text-foreground">No Participants Yet</h3>
                      <p className="max-w-xs text-sm">
                        No participants have joined this challenge yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="q/a" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
            {!isLoggedIn ? (
              <Card className="border shadow-sm p-4 min-h-[400px]">
                <div className="mb-8 text-left m-3">
                  <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <HelpCircle className="h-8 w-8" />
                    Q/A Forum
                  </h2>
                  <p className="text-muted-foreground">
                    Ask questions and collaborate with others on this challenge.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Access Required</h3>
                  <p className="max-w-xs text-sm">Please log in to view the Q/A forum.</p>
                </div>
                <CardContent>
                </CardContent>
              </Card>
            ) : (
              <QAForum collaborationId={challenge?.id} isExpired={isChallengeExpiredOrStopped} />
            )}
          </TabsContent>

          <TabsContent value="faq" className='overflow-y-auto h-[calc(90vh-350px)] md:h-[calc(90vh-250px)]'>
            <Card className="border shadow-sm p-4 min-h-[400px]">
              <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <HelpCircle className="h-8 w-8" />
                  FAQ
                </h2>
                <p className="text-muted-foreground">
                  Answer to your questions about this challenge.
                </p>
              </div>
              <CardContent >
                <Accordion
                  type="single"
                  collapsible
                  className="w-full md:w-[95%] mx-auto"
                >
                  {sampleFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className='text-left hover:no-underline'>{faq.question}</AccordionTrigger>
                      <AccordionContent className='leading-relaxed'>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs >
      </DialogContent >

      <Dialog
        open={!hasAgreed && showTermsDialog}
        onOpenChange={(open) => {
          if (!open) setShowTermsDialog(false);
        }}
      >
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Terms & Conditions</DialogTitle>
            <DialogDescription>
              Please review the following terms before submitting your solution.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea
            ref={termsRef}
            onScrollCapture={handleScroll}
            className="max-h-[40vh] border rounded-md p-4 text-sm"
          >
            <div className="pr-4 space-y-4">
              <div className={`space-y-3 ${!scrolledToEnd ? 'text-muted-foreground' : 'text-current'}`}>
                <h3 className="font-semibold text-lg">Originality & Ownership</h3>
                <p>
                  All submissions must be original work, free of plagiarism, and not infringe on third-party
                  intellectual property. The organizer may request evidence of ownership if required.
                </p>
                <h3 className="font-semibold text-lg">Submission Rights</h3>
                <p>
                  By submitting a solution, the participant grants the organizer the non-exclusive right to
                  review, evaluate, and use the submission for challenge purposes (such as judging and display
                  during the event).
                </p>

                <h3 className="font-semibold text-lg">Confidentiality</h3>
                <p>
                  The organizer will treat submissions as confidential, but cannot guarantee absolute
                  confidentiality due to online review processes or public events.
                </p>

                <h3 className="font-semibold text-lg">Disqualification</h3>
                <p>
                  Submissions that violate the platform’s code of conduct, include prohibited content, or do
                  not comply with stated rules may be disqualified.
                </p>

                <h3 className="font-semibold text-lg">Liability</h3>
                <p>
                  The organizer is not responsible for any technical malfunctions, lost data, or issues
                  arising from the submission process.
                </p>

                <h3 className="font-semibold text-lg">Acceptance of Terms</h3>
                <p>
                  Participants must accept these terms to proceed with submission.
                </p>
                <p>
                  By checking the box below, you acknowledge that you have read and agree to these
                  terms.
                </p>
              </div>


            </div>
          </ScrollArea>


          {/* Agree section */}
          <div className="flex items-center mt-4 gap-2">
            <input
              type="checkbox"
              disabled={!scrolledToEnd}
              checked={agreeChecked}
              onChange={(e) => setAgreeChecked(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span
              className={`text-sm ${!scrolledToEnd ? 'text-muted-foreground' : 'text-current'}`}
            >
              I agree to the Terms & Conditions
            </span>
          </div>

          {/* Proceed button */}
          <div className="flex justify-end mt-6">
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleAgreeAndProceed}
              disabled={!agreeChecked}
            >
              Proceed to Submission
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmissionForm} onOpenChange={setShowSubmissionForm}>
        <DialogContent
          className="max-w-[90vw] w-[90vw] max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold font-headline">Submit Your Solution</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit your idea for this challenge.
            </DialogDescription>
          </DialogHeader>

          {challengeId && (
            <SolutionSubmissionForm
              challengeId={challengeId || challenge.id}
              onSubmissionSuccess={handleSubmissionSuccess}
              onCancel={handleCancelSubmission}
            />
          )}


        </DialogContent>
      </Dialog>
      <AnnouncementDialog
        open={isAnnouncementDialogOpen}
        onOpenChange={handleAnnouncementDialogClose}
        collaborationId={collaborationId}
        editingAnnouncement={editingAnnouncement}
        onAnnouncementCreated={fetchAnnouncements}
      />

      <AlertDialog open={!!deleteAnnouncementId} onOpenChange={(open) => !open && setDeleteAnnouncementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this announcement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAnnouncement}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog >
  );
}