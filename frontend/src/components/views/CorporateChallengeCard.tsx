import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "../ui/progress";
import { useChallengeProgress } from "@/components/ui/useChallengeProgress";
import removeMarkdown from "remove-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export const CorporateChallengeCard = ({
    challenge,
    onViewDetails,
}: {
    challenge: any;
    onViewDetails: (
        type: "CorporateChallenges" | "MSMECollaboration" | "GovernmentChallenges",
        challenge: any
    ) => void;
}) => {
    const { progress, daysRemaining } = useChallengeProgress(challenge);
    const isClosed =
        challenge.status === "stopped" ||
        challenge.status === "expired";

    // const [isLoading, setIsLoading] = useState(true);

    // if (isLoading) {
    //     return (
    //         <Card className="bg-card flex flex-col w-full md:w-[18rem] antialiased border-none">
    //             <CardHeader>
    //                 <div className="flex items-center gap-4">
    //                     <Skeleton className="h-[60px] w-[60px] rounded-lg" />
    //                     <div className="flex-1 space-y-2">
    //                         <Skeleton className="h-4 w-full" />
    //                         <Skeleton className="h-3 w-3/4" />
    //                         <Skeleton className="h-5 w-1/2" />
    //                     </div>
    //                 </div>
    //             </CardHeader>
    //             <CardContent className="flex-grow">
    //                 <Skeleton className="h-3 w-full mb-2" />
    //                 <Skeleton className="h-3 w-full mb-2" />
    //                 <Skeleton className="h-3 w-2/3" />
    //             </CardContent>
    //             <CardFooter className="flex-col items-start space-y-2">
    //                 <Skeleton className="h-5 w-1/3" />
    //                 <Skeleton className="h-10 w-full" />
    //                 <Skeleton className="h-2 w-full" />
    //             </CardFooter>
    //         </Card>
    //     );
    // }

    return (
        <Card className="bg-card flex flex-col w-full md:w-[14rem] lg:w-[18rem] antialiased border-none" onClick={() => onViewDetails("CorporateChallenges", challenge)}>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-[60px] w-[60px] rounded-lg">
                        <AvatarImage src={challenge.logo_url} alt={challenge.company_name} />
                        <AvatarFallback className="rounded-lg font-headline bg-accent/80 text-current text-xl font-bold flex items-center justify-center border border-white/20">
                            {challenge.company_name ? challenge.company_name[0] : "C"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className={`text-base line-clamp-1 ${isClosed ? "text-red-600" : ""}`}>
                            {challenge.title}
                        </CardTitle>

                        <CardDescription className="blur-sm">
                            {challenge.company_name || ''}
                        </CardDescription>

                        <Badge variant={isClosed ? "destructive" : "secondary"} className="line-clamp-1 w-[50%] mt-1">
                            {challenge.company_sector}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground line-clamp-3">
                    {removeMarkdown(challenge.description)}
                </div>
            </CardContent>

            <CardFooter className="flex-col items-start space-y-2">
                {!isClosed && <Badge variant={"outline"}>
                    <>
                        Reward:{" "}
                        {challenge.reward_amount
                            ? `₹${challenge.reward_amount}`
                            : `₹${challenge.reward_min} - ₹${challenge.reward_max}`}
                    </>
                </Badge>}

                <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50"
                    onClick={() => onViewDetails("CorporateChallenges", challenge)}
                >
                    {"View Challenge"}
                </Button>

                <div className="w-full mt-1">
                    <Progress
                        value={isClosed ? 100 : progress}
                        className="h-[6px]"
                        indicatorClassName={isClosed ? "bg-red-500" : "bg-primary"}
                    />

                    <div className="flex justify-between items-end text-xs text-muted-foreground mt-1">
                        <p>{challenge.submission_count} Sub...</p>
                        {isClosed ? (
                            <span className="text-red-600 font-semibold">Closed</span>
                        ) : (
                            <span>{daysRemaining}d remaining</span>
                        )}
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
};
