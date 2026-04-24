import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import * as LucideIcons from "lucide-react";

interface IpActionsProps {
    ipId: string;
    statusUpdates: Record<string, "approved" | "rejected" | "needInfo">;
    isUpdating: Record<string, boolean>;
    handleUpdateStatus: (id: string) => void;
    handleActionClick: (id: string, action: "approved" | "rejected" | "needInfo") => void;
}

export const IpActions: React.FC<IpActionsProps> = ({
    ipId,
    statusUpdates,
    isUpdating,
    handleUpdateStatus,
    handleActionClick,
}) => {
    
    return (
        <div className="flex items-center gap-2 ml-auto">
            {statusUpdates[ipId] && (
                <Button
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(ipId);
                    }}
                    disabled={isUpdating[ipId]}
                >
                    {isUpdating[ipId] ? (
                        <LucideIcons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LucideIcons.Save className="mr-2 h-4 w-4" />
                    )}
                    Update Status
                </Button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Actions
                        <LucideIcons.ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                >
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(ipId, "approved");
                        }}
                    >
                        <LucideIcons.CheckCircle className="mr-2 h-4 w-4" />
                        <span>Approve</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(ipId, "rejected");
                        }}
                    >
                        <LucideIcons.XCircle className="mr-2 h-4 w-4" />
                        <span>Reject</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className="focus:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(ipId, "needInfo");
                        }}
                    >
                        <LucideIcons.XCircle className="mr-2 h-4 w-4" />
                        <span>Need Info</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
