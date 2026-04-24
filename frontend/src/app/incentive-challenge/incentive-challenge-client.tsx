"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Trophy,
    Users,
    Lightbulb,
    Calendar,
    Bell,
    Award,
    HelpCircle,
    Target,
    Rocket,
    Star,
    CheckCircle,
    Home
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Footer from '@/components/layout/footer';

export default function IncentiveChallengeClient() {
    const router = useRouter();
    const [navOpen, setNavOpen] = useState(false);

    useEffect(() => {
        if (navOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [navOpen]);

    return (
        <div className="relative flex flex-col min-h-screen bg-background">
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <div onClick={() => router.push("/")} className="cursor-pointer">
                    <Image src="/logo.png" alt="Hustloop Logo" width={120} height={120} />
                </div>
                <Link href="/" passHref>
                    <Button variant="outline" size="icon" aria-label="Home">
                        <Home className="h-5 w-5" />
                    </Button>
                </Link>
            </div>
            <main
                className="flex-grow container relative z-40 ultrawide-fix m-auto pointer-events-auto px-4 py-12 md:pb-4 pt-20"
                id="main-view"
                data-alt-id="card-anchor"
            >
                <div className="bg-gradient-to-b from-background to-muted/20">
                    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Lightbulb className="h-8 w-8 text-primary" />
                                <h1 className="text-4xl font-bold tracking-tight">What is an Incentive Challenge?</h1>
                            </div>

                            <div className="max-w-none space-y-4">
                                <p className="text-lg leading-relaxed">
                                    An incentive challenge is a structured prize competition where participants submit innovative ideas or solutions to address a clearly defined problem. These challenges are designed to tap into the collective creativity of innovators, startups, students, and professionals by offering meaningful rewards that go beyond just financial compensation.
                                </p>
                                <p className="text-lg leading-relaxed">
                                    Whether you&apos;re looking to solve real-world problems, showcase your expertise, or build partnerships with industry leaders, incentive challenges provide a platform where innovation meets opportunity. Participants are motivated by a combination of cash prizes, recognition, pilot opportunities, mentorship, and the chance to make a tangible impact in their chosen domain.
                                </p>
                            </div>
                        </section>

                        <Separator />

                        {/* Why Participate */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Target className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">Why Participate? (Incentives)</h2>
                            </div>

                            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                                <CardContent className="pt-6">
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3">
                                            <div className="mt-1 h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <strong className="text-lg">Prize Money & Financial Rewards</strong>
                                                <p className="text-muted-foreground mt-1">
                                                    Win substantial cash prizes ranging from thousands to lakhs, providing financial support to bring your ideas to life.
                                                </p>
                                            </div>
                                        </li>

                                        <li className="flex items-start gap-3">
                                            <div className="mt-1 h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <strong className="text-lg">Pilot & Proof-of-Concept Opportunities</strong>
                                                <p className="text-muted-foreground mt-1">
                                                    Get the chance to implement your solution with the challenge organizer, turning your concept into a real-world deployment.
                                                </p>
                                            </div>
                                        </li>

                                        <li className="flex items-start gap-3">
                                            <div className="mt-1 h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <strong className="text-lg">Visibility Across the Ecosystem</strong>
                                                <p className="text-muted-foreground mt-1">
                                                    Gain recognition through the Hall of Fame, social media features, demo days, and media coverage, boosting your brand and credibility.
                                                </p>
                                            </div>
                                        </li>

                                        <li className="flex items-start gap-3">
                                            <div className="mt-1 h-6 w-6 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-4 w-4 text-pink-600" />
                                            </div>
                                            <div>
                                                <strong className="text-lg">Networking & Collaboration</strong>
                                                <p className="text-muted-foreground mt-1">
                                                    Connect with fellow founders, organisation, innovators, investors, and potential customers, opening doors to partnerships and future opportunities.
                                                </p>
                                            </div>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </section>

                        <Separator />

                        {/* Who Can Participate */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">Who Can Participate?</h2>
                            </div>

                            <Card className="bg-card/50 backdrop-blur-sm">
                                <CardContent className="pt-6">
                                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                                        Incentive challenges are open to a diverse range of participants, fostering innovation from all corners of the ecosystem. Whether you&apos;re just starting your journey or are an established professional, there&apos;s a place for you.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                                            <Star className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Students & Researchers</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                                            <Star className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Innovators & Inventors</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                                            <Star className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Early-Stage Founders</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                                            <Star className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Professionals & Experts</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                                            <Star className="h-5 w-5 text-primary" />
                                            <span className="font-medium">Technology Enthusiasts</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mt-6 italic">
                                        Note: Specific challenges may have additional filters such as country, industry vertical, experience level, or technology focus depending on the organizer&apos;s requirements. Always check the individual challenge details for eligibility criteria.
                                    </p>
                                </CardContent>
                            </Card>
                        </section>

                        <Separator />

                        {/* How It Works - Timeline */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">How It Works – Timeline</h2>
                            </div>

                            <p className="text-muted-foreground text-lg">
                                Every incentive challenge follows a structured timeline to ensure fairness, transparency, and maximum impact. Here&apos;s what you can expect:
                            </p>

                            <div className="relative space-y-8 before:absolute before:left-[15px] before:top-[30px] before:bottom-0 before:w-[2px] before:bg-border">
                                {/* Step 1 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                                        1
                                    </div>
                                    <div className="flex-1 pb-8">
                                        <h3 className="text-xl font-bold mb-2">Launch</h3>
                                        <p className="text-muted-foreground">
                                            The challenge is officially announced with complete details including problem statement, rewards, timeline, and eligibility criteria. All registered users are notified via email and platform announcements.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                                        2
                                    </div>
                                    <div className="flex-1 pb-8">
                                        <h3 className="text-xl font-bold mb-2">Applications Open</h3>
                                        <p className="text-muted-foreground">
                                            Participants can begin submitting their innovative solutions through the platform. You&apos;ll need to provide a detailed description, key features, implementation plan, and any supporting documents.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                                        3
                                    </div>
                                    <div className="flex-1 pb-8">
                                        <h3 className="text-xl font-bold mb-2">Application Deadline</h3>
                                        <p className="text-muted-foreground">
                                            This is the final date to submit your entries. No submissions will be accepted after this cutoff time. Make sure your solution is complete, well-documented, and ready for evaluation.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                                        4
                                    </div>
                                    <div className="flex-1 pb-8">
                                        <h3 className="text-xl font-bold mb-2">Shortlisting & Evaluation</h3>
                                        <p className="text-muted-foreground">
                                            A panel of expert judges reviews all submissions based on predefined criteria such as innovation, feasibility, impact, and alignment with the problem statement. Top candidates are shortlisted for the next phase.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>

                                {/* Step 5 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                                        5
                                    </div>
                                    <div className="flex-1 pb-8">
                                        <h3 className="text-xl font-bold mb-2">Final Submission / Demo Day</h3>
                                        <p className="text-muted-foreground">
                                            Shortlisted teams present their refined solutions through live demos, pitch presentations, or detailed reports to the judging panel. This is your opportunity to showcase the value and impact of your innovation.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>

                                {/* Step 6 */}
                                <div className="relative flex gap-6">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold z-10">
                                        6
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-2">Winner Announcement</h3>
                                        <p className="text-muted-foreground">
                                            Winners are officially revealed and celebrated! Rewards are distributed, partnerships are formalized, and winning teams are featured in the Hall of Fame, media coverage, and across social platforms.
                                        </p>
                                        <Badge variant="outline" className="mt-2">Date: [To be announced]</Badge>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Announcements */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Bell className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
                            </div>

                            <Card className="bg-card/50 backdrop-blur-sm">
                                <CardContent className="pt-6 space-y-4">
                                    <p className="text-muted-foreground">
                                        Stay updated with all official announcements related to this challenge. Important updates will be displayed here and emailed to all registered participants.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-500/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs">Update</Badge>
                                                <span className="text-xs text-muted-foreground">Date: [TBA]</span>
                                            </div>
                                            <h4 className="font-semibold">Challenge Launch</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Official announcement of the challenge with complete details, eligibility, and submission guidelines.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-lg border-l-4 border-orange-500 bg-orange-500/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs">Deadline</Badge>
                                                <span className="text-xs text-muted-foreground">Date: [TBA]</span>
                                            </div>
                                            <h4 className="font-semibold">Deadline Reminders</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Regular reminders about upcoming submission deadlines and important dates.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-500/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs">Result</Badge>
                                                <span className="text-xs text-muted-foreground">Date: [TBA]</span>
                                            </div>
                                            <h4 className="font-semibold">Shortlist Announcement</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Notification of shortlisted candidates who will proceed to the next evaluation phase.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-500/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs">Result</Badge>
                                                <span className="text-xs text-muted-foreground">Date: [TBA]</span>
                                            </div>
                                            <h4 className="font-semibold">Winner Announcement</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Official declaration of winners with details about rewards, next steps, and recognition.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Note:</strong> All official updates will be displayed in this section and automatically emailed to registered participants. Make sure your email notifications are enabled to stay informed.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <Separator />

                        {/* Hall of Fame */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Trophy className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">Hall of Fame</h2>
                            </div>

                            <p className="text-muted-foreground text-lg">
                                Celebrating excellence and innovation! Our Hall of Fame permanently showcases winning teams, individuals, and their groundbreaking solutions to inspire future participants.
                            </p>

                            <Card className="bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-orange-500/5 border-2 border-yellow-500/20">
                                <CardContent className="pt-6 space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Award className="h-6 w-6 text-yellow-600" />
                                            How the Hall of Fame Works
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            The Hall of Fame is our way of recognizing and celebrating the contributions of all participants—whether you&apos;re part of a team or competing individually. Every participant&apos;s journey is valued, and your achievements are tracked through a transparent points-based system.
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-primary">Points System</h4>
                                        <div className="grid gap-4">
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="h-8 w-8 rounded-full bg-gray-500/10 flex items-center justify-center">
                                                        <span className="text-lg font-bold">0</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold mb-1">Participants (0 Points)</h5>
                                                    <p className="text-sm text-muted-foreground">
                                                        All participants who submit their solutions start with 0 points. Your participation itself is valuable, and you&apos;re part of the innovation ecosystem!
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                        <span className="text-lg font-bold text-green-600">50</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold mb-1">Solution Accepted (50 Points)</h5>
                                                    <p className="text-sm text-muted-foreground">
                                                        When your solution is reviewed and accepted by the evaluation panel, you earn 50 points! This recognition shows that your idea has merit and potential impact.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border-2 border-yellow-500/30">
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="h-8 w-8 rounded-full bg-yellow-500/30 flex items-center justify-center">
                                                        <Trophy className="h-5 w-5 text-yellow-600" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold mb-1 flex items-center gap-2">
                                                        Winners (Full Points + Rewards)
                                                    </h5>
                                                    <p className="text-sm text-muted-foreground">
                                                        Winners receive the maximum points based on the challenge criteria, along with cash prizes, recognition, pilot opportunities, and permanent showcase in the Hall of Fame. Your innovation becomes part of our legacy!
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <h4 className="text-lg font-semibold text-primary">Recognition for All</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Whether you&apos;re a team or an individual, whether you&apos;re just starting out or have won multiple challenges, the Hall of Fame celebrates your journey.Participants are publicly showcased to inspire others.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <Separator />

                        {/* FAQ */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <HelpCircle className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                            </div>

                            <p className="text-muted-foreground text-lg">
                                Here are answers to common questions about this incentive challenge. If you have additional questions, feel free to reach out to our support team.
                            </p>

                            <div className="space-y-4">
                                {/* FAQ 1 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Who can apply?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Anyone with an innovative solution can apply! This includes students, researchers, innovators, early-stage founders, organisation, professionals, and technology enthusiasts. Some challenges may have specific eligibility criteria such as geographic location, industry focus, or experience level—always check the individual challenge details for any additional requirements.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 2 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">How to apply and what to submit?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-3">
                                            To apply, you&apos;ll need to submit the following through our platform:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                            <li><strong>Pitch Deck:</strong> A concise presentation (PDF/PPT) outlining your solution, problem statement, market opportunity, and implementation plan</li>
                                            <li><strong>Prototype or Demo:</strong> If applicable, a working prototype, mockup, or proof-of-concept demonstrating your solution</li>
                                            <li><strong>Supporting Documents:</strong> Any additional materials such as technical specifications, research papers, or case studies</li>
                                        </ul>
                                        <p className="text-muted-foreground mt-3">
                                            All submissions must be made before the application deadline. You can update your submission until the cutoff time.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 3 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">What is the allowed team size?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Both individual participants and teams are welcome! Team size typically ranges from 1 to 5 members, though specific challenges may have different requirements. Teams should designate one person as the primary contact for all communications. Collaborative submissions are encouraged as they often bring diverse perspectives and expertise to solve complex problems.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 4 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">What criteria are used for evaluation?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-3">
                                            Submissions are evaluated by a panel of expert judges based on the following criteria:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                            <li><strong>Innovation:</strong> Uniqueness and creativity of the solution</li>
                                            <li><strong>Feasibility:</strong> Practicality and ease of implementation</li>
                                            <li><strong>Impact:</strong> Potential to solve the problem and create meaningful change</li>
                                            <li><strong>Scalability:</strong> Ability to grow and adapt to larger markets</li>
                                            <li><strong>Alignment:</strong> How well the solution addresses the challenge&apos;s problem statement</li>
                                            <li><strong>Presentation:</strong> Clarity and quality of the submission materials</li>
                                        </ul>
                                        <p className="text-muted-foreground mt-3">
                                            Each criterion may be weighted differently depending on the specific challenge objectives.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 5 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Who owns the IP and submitted data?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            <strong>You retain full ownership of your intellectual property.</strong> All submissions, ideas, prototypes, and related materials remain the property of the participants. By submitting, you grant the challenge organizer a limited, non-exclusive license to review, evaluate, and showcase your solution for the purposes of the challenge. Any commercial use, partnership, or licensing agreements will be negotiated separately with explicit consent. Your data is kept confidential and used solely for evaluation purposes.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 6 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">How will communication and support be provided?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-3">
                                            We ensure transparent and timely communication throughout the challenge:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                            <li><strong>Email Notifications:</strong> All registered participants receive updates about deadlines, announcements, and results</li>
                                            <li><strong>Platform Announcements:</strong> Important updates are posted in the Announcements section</li>
                                            <li><strong>Q&A Forum:</strong> Ask questions and get answers from organizers and fellow participants</li>
                                            <li><strong>Support Team:</strong> Dedicated support available via email at support@hustloop.com</li>
                                            <li><strong>Mentorship Sessions:</strong> Shortlisted teams may receive one-on-one guidance from experts</li>
                                        </ul>
                                        <p className="text-muted-foreground mt-3">
                                            Make sure your email notifications are enabled to stay informed about all updates.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* FAQ 7 */}
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">What happens after winning?</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-3">
                                            Winning opens up exciting opportunities beyond just the prize money:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                            <li><strong>Pilot Projects:</strong> Opportunity to implement your solution with the challenge organizer</li>
                                            <li><strong>Partnerships:</strong> Potential collaborations with corporates, MSMEs, and industry leaders</li>
                                            <li><strong>Visibility:</strong> Featured in the Hall of Fame, media coverage, social media, and demo days</li>
                                            <li><strong>Networking:</strong> Access to a network of investors, mentors, and potential customers</li>
                                            <li><strong>Continued Support:</strong> Ongoing mentorship and guidance to scale your solution</li>
                                            <li><strong>Recognition:</strong> Certificates, awards, and permanent showcase on the platform</li>
                                        </ul>
                                        <p className="text-muted-foreground mt-3">
                                            Winners are celebrated and supported in their journey to bring their innovations to market and create lasting impact.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        {/* Footer CTA */}
                        <div className="text-center py-12 space-y-4">
                            <Rocket className="h-12 w-12 text-primary mx-auto" />
                            <h3 className="text-2xl font-bold">Ready to Make an Impact?</h3>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Join thousands of innovators who are solving real-world problems and building the future. Your next big opportunity awaits!
                            </p>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
