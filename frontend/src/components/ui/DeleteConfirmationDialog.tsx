import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from "./input";
import { Button } from "./button";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string | number;
  onDelete: (id: string | number) => void;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ open, onOpenChange, submissionId, onDelete }) => {
  const [confirmationText, setConfirmationText] = useState("");

  const handleConfirm = () => {
    if (confirmationText.toLowerCase() === "delete") {
      onDelete(submissionId);
      setConfirmationText("");
      onOpenChange(false);
    } else {
      alert("You must type 'delete' to confirm");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            Type <strong>delete</strong> in the box below to permanently delete this submission.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          placeholder="Type 'delete' to confirm"
          value={confirmationText}
          onChange={(e) => {
            e.stopPropagation(); 
            setConfirmationText(e.target.value);
          }}
          onClick={(e)=>{
            e.stopPropagation(); 
          }}
          className="mt-2"
        />

        <AlertDialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); 
              onOpenChange(false); 
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation(); 
              handleConfirm();
            }}
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
