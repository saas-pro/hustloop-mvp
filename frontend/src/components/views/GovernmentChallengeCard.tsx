import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "../ui/progress";
import { MarkdownViewer } from "../ui/markdownViewer";
import { useChallengeProgress } from "@/components/ui/useChallengeProgress";

export const GovermentChallengeCard = ({
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
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-[60px] w-[60px] rounded-lg">
                        <AvatarImage src={challenge.logo_url} alt={challenge.company_name} />
                        <AvatarFallback className="rounded-lg bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-accent via-emerald-400 to-cyan-500 text-black text-xl font-bold border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                            {challenge.company_avatar || (challenge.company_name ? challenge.company_name[0] : "C")}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-base">{challenge.title}</CardTitle>
                        <CardDescription>{challenge.company_name}</CardDescription>
                        <Badge variant="secondary">{challenge.company_sector}</Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground line-clamp-3">
                    <MarkdownViewer content={challenge.description} />
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
                <Badge variant="outline">
                    Reward:{" "}
                    {challenge.reward_amount
                        ? `₹${challenge.reward_amount}`
                        : `₹${challenge.reward_min} - ₹${challenge.reward_max}`}
                </Badge>
                <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => onViewDetails("CorporateChallenges", challenge)}
                >
                    View Challenge
                </Button>
                <div className="w-full">
                    <Progress value={progress} className="h-[6px]" />
                    <div className="flex justify-end items-end text-xs text-muted-foreground">
                        <span>{daysRemaining}d remaining</span>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
};
