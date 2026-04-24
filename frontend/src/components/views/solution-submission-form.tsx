"use client";

import { useState, useId, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import SolutionMarkdown from "../ui/SolutionMarkdown";
import { API_BASE_URL } from "@/lib/api";
import { FileText, Upload, X, Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image";

const placeholderStepImages = {
    step1: "https://placehold.co/800x800?text=Dashboard+Screen",
    step2: "https://placehold.co/800x800?text=Team+Tab",
    step3: "https://placehold.co/800x800?text=Challenge+Details",
    step4: "https://placehold.co/800x800?text=Add+Team+Member+Popup",
    step5: "https://placehold.co/800x800?text=Email+Verification+Step",
};

// uploaded file path from conversation history (will be transformed to URL by tooling)
const uploadedDemoImage = "/mnt/data/9fb64f68-b792-4b07-a0ec-7320574910dc.png";

const solutionSubmissionSchema = z.object({
    description: z
        .string()
        .min(10, "Description must be at least 10 characters long.")
        .max(5000, "Description is too long."),
    contactName: z.string().min(2, "Contact name must be at least 2 characters long.").max(300, "Too long."),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number."),
    placeOfResidence: z.string().min(3, "Place of residence must be at least 3 characters long.").max(50, "Too long."),
    state: z.string().min(2, "State name must be at least 2 characters long.").max(50, "Too long."),
    files: z
        .array(z.instanceof(File))
        .max(5, "You can upload up to 5 files.")
        .refine(
            (files) =>
                files.every(
                    (file) =>
                        file.type === "application/pdf" ||
                        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
            { message: "Files must be PDF or DOCX." }
        )
        .refine((files) => files.every((file) => file.size <= 10 * 1024 * 1024), {
            message: "Each file must be under 10 MB.",
        })
        .optional(),
    submissionType: z.enum(["individual", "team"]),
    teamMembers: z.array(z.string().email()).optional(),
});

type SolutionSubmissionSchema = z.infer<typeof solutionSubmissionSchema>;

interface SolutionSubmissionFormProps {
    challengeId: number | string;
    onSubmissionSuccess: () => void;
    onCancel: () => void;
}

export function SolutionSubmissionForm({ challengeId, onSubmissionSuccess, onCancel }: SolutionSubmissionFormProps) {
    const [loading, setLoading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [confirmLoadDraft, setConfirmLoadDraft] = useState(false);
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [teamList, setTeamList] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
    const [teamWizardOpen, setTeamWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [finalSuccessOpen, setFinalSuccessOpen] = useState(false);
    const [teamAcknowledgeOpen, setTeamAcknowledgeOpen] = useState(false);

    const form = useForm<SolutionSubmissionSchema>({
        resolver: zodResolver(solutionSubmissionSchema),
        defaultValues: {
            contactName: "",
            submissionType: "individual",
            teamMembers: [],
        },
    });

    const { register, handleSubmit, setValue, watch, formState } = form;
    const { errors } = formState;

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setValue("contactName", parsedUser.name || "");
            } catch {
                /* ignore */
            }
        }
    }, [setValue]);

    useEffect(() => {
        setValue("teamMembers", teamList);
    }, [teamList, setValue]);

    const selectedFiles = watch("files") || [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        if (newFiles.length === 0) return;

        const currentFiles = selectedFiles || [];
        const uniqueNewFiles = newFiles.filter((newFile) => !currentFiles.some((f) => f.name === newFile.name));
        const updatedFiles = [...currentFiles, ...uniqueNewFiles].slice(0, 5);
        setValue("files", updatedFiles, { shouldValidate: true });
        e.target.value = "";
    };

    const handleRemoveFile = (index: number) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setValue("files", updatedFiles, { shouldValidate: true });
    };

    const saveDraft = useCallback((data: SolutionSubmissionSchema) => {
        const draft = { ...data };
        localStorage.setItem(`draft_${challengeId}`, JSON.stringify(draft));
        setHasDraft(true);
        toast({ title: "Draft saved", description: "Your progress has been saved as a draft." });
    }, [challengeId]);

    const loadDraft = () => {
        try {
            const draft = localStorage.getItem(`draft_${challengeId}`);
            if (!draft) {
                toast({
                    title: "No draft found",
                    description: "No saved draft was found for this challenge.",
                });
                return;
            }

            const parsedDraft = JSON.parse(draft);

            form.reset();

            Object.entries(parsedDraft).forEach(([key, value]) => {
                if (key !== 'files') {
                    form.setValue(key as any, value, { shouldValidate: true });
                }
            });

            if (parsedDraft.teamMembers) {
                setTeamList(parsedDraft.teamMembers);
            }

            setHasDraft(false);
            localStorage.removeItem(`draft_${challengeId}`)
            toast({
                title: "Draft loaded",
                description: "Your draft has been loaded successfully.",
            });
        } catch (error) {
            console.error("Error loading draft:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load draft. The draft data might be corrupted.",
            });
        }
    };

    useEffect(() => {
        setHasDraft(!!localStorage.getItem(`draft_${challengeId}`));

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const formValues = form.getValues();
            if (formValues.description || formValues.contactName || (formValues.files && formValues.files.length > 0)) {
                e.preventDefault();
                saveDraft(formValues);
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [challengeId, form, saveDraft]);


    const startSubmitFlow = async (data: SolutionSubmissionSchema) => {
        if (!agreeToTerms) {
            toast({
                variant: "destructive",
                title: "Agreement required",
                description: "You must agree to Terms & Conditions to submit."
            });
            throw new Error("Agreement required");
        }
        setChoiceDialogOpen(true);
    };

    const handleLoadDraftClick = () => {
        const formValues = form.getValues();
        const hasFormData = Object.values(formValues).some(value =>
            (Array.isArray(value) ? value.length > 0 : Boolean(value))
        );

        if (hasFormData) {
            setConfirmLoadDraft(true);
        } else {
            loadDraft();
        }
    };

    const performSubmit = async (data: SolutionSubmissionSchema & { submissionType?: "individual" | "team" }) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast({ variant: "destructive", title: "You must be logged in to submit a solution." });
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append("description", data.description);
            formData.append("contactName", data.contactName);
            formData.append("mobileNumber", data.mobileNumber);
            formData.append("placeOfResidence", data.placeOfResidence);
            formData.append("state", data.state);
            formData.append("submissionType", data.submissionType || "individual");

            if (data.files && data.files.length > 0) {
                data.files.forEach((file) => formData.append("files", file));
            }

            const response = await fetch(`${API_BASE_URL}/api/solutions/${challengeId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to submit solution");
            }

            await response.json();

            toast({
                title: "Solution submitted successfully!",
                description: "Your solution was uploaded.",
            });

            setChoiceDialogOpen(false);
            setTeamWizardOpen(false);
            setWizardStep(1);
            setFinalSuccessOpen(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to submit solution", description: error.message || "Please try again later." });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            await startSubmitFlow(data);
            localStorage.removeItem(`draft_${challengeId}`);
            setHasDraft(false);
        } catch (error) {
            console.error('Submission error:', error);
            throw error;
        }
    });

    const confirmIndividual = async () => {
        const data = form.getValues();
        await performSubmit({ ...data, submissionType: "individual" });
    };

    const startTeamWizard = () => {
        setChoiceDialogOpen(false);
        setTeamWizardOpen(true);
        setWizardStep(1);
    };

    const wizardNext = () => {
        if (wizardStep < 5) setWizardStep((s) => s + 1);
    };
    const wizardBack = () => {
        if (wizardStep > 1) setWizardStep((s) => s - 1);
    };

    const confirmTeamSubmit = () => {
        setTeamAcknowledgeOpen(true);
    };

    const handleTeamAcknowledge = async () => {
        const data = form.getValues();
        setTeamAcknowledgeOpen(false);
        await performSubmit({ ...data, submissionType: "team" });
    };

    const resetAll = () => {
        setTeamList([]);
        setEmailInput("");
        setWizardStep(1);
        setTeamWizardOpen(false);
        setChoiceDialogOpen(false);
        setFinalSuccessOpen(false);
        form.reset({
            contactName: "",
            mobileNumber: "",
            placeOfResidence: "",
            state: "",
            description: `[Briefly describe your solution and how it addresses the identified challenge.]

---

## Key Features
- Feature 1: Short description.
- Feature 2: Short description.
- Feature 3: Short description.

---

## Benefits
- Benefit 1: Short description.
- Benefit 2: Short description.
- Benefit 3: Short description.

---

## Implementation Plan
1. Step 1: Describe the first action or phase.
2. Step 2: Outline the next action.
3. Step 3: Add further steps as needed.

---

`,
            files: [],
            submissionType: "individual",
            teamMembers: [],
        });
    };

    const wizardStepContent = [
        {
            title: "Step 1 — Go to Dashboard",
            text: "After submitting the solution, go to your Dashboard to manage the team.",
            img: placeholderStepImages.step1,
        },
        {
            title: "Step 2 — Open the Team Tab",
            text: "Navigate to the Team Members tab in the solution view.",
            img: placeholderStepImages.step2,
        },
        {
            title: "Step 3 — Select your Challenge",
            text: "Click the challenge/solution you created to open its details.",
            img: placeholderStepImages.step3,
        },
        {
            title: "Step 4 — Add Team Members",
            text: "Click Add Team Member and enter their email IDs (this is done in the solution's Team tab).",
            img: placeholderStepImages.step4,
        },
        {
            title: "Step 5 — Members Verify",
            text: "Invited members will receive an email; they must click the verification link to join the team.",
            img: placeholderStepImages.step5,
        },
    ];

    return (
        <div>
            <form onSubmit={onSubmit} className="space-y-6">
                <div>
                    <Label htmlFor="description" className="mb-2 block">
                        Description <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <SolutionMarkdown
                        solutionForm={form}
                        defaultDescription={`[Briefly describe your solution and how it addresses the identified challenge.]

---

## Key Features
- Feature 1: Short description.
- Feature 2: Short description.
- Feature 3: Short description.

---

## Benefits
- Benefit 1: Short description.
- Benefit 2: Short description.
- Benefit 3: Short description.

---

## Implementation Plan
1. Step 1: Describe the first action or phase.
2. Step 2: Outline the next action.
3. Step 3: Add further steps as needed.

---

`}
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div>
                    <Label htmlFor={fileInputId} className="mb-2 block">
                        Upload Documents (PDF or DOCX, up to 5 files)
                    </Label>

                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setIsDragging(true)}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const droppedFiles = Array.from(e.dataTransfer.files || []);
                            const allowedFiles = droppedFiles.filter(
                                (file) =>
                                    file.type === "application/pdf" ||
                                    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            );
                            if (allowedFiles.length === 0) {
                                toast({ variant: "destructive", title: "Invalid file type", description: "Only PDF or DOCX files are allowed." });
                                return;
                            }
                            const currentFiles = selectedFiles || [];
                            const uniqueNewFiles = allowedFiles.filter((newFile) => !currentFiles.some((f) => f.name === newFile.name));
                            const updatedFiles = [...currentFiles, ...uniqueNewFiles].slice(0, 5);
                            setValue("files", updatedFiles, { shouldValidate: true });
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/60"
                            }`}
                    >
                        <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF or DOCX files only (Max 5 files, each ≤ 10 MB)</p>
                    </div>

                    <Input
                        ref={fileInputRef}
                        id={fileInputId}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {selectedFiles.length > 0 && (
                        <ul className="mt-4 border rounded-md">
                            {selectedFiles.map((file, index) => (
                                <li key={index} className="flex items-center justify-between p-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" type="button" onClick={() => handleRemoveFile(index)}>
                                        Remove
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {errors?.files && <p className="text-red-500 text-sm mt-1">{errors.files.message}</p>}
                </div>

                <div className="border rounded-md p-4">
                    <h3 className="font-semibold text-lg mb-4">Contact Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="contactName" className="mb-2 block">
                                Contact Name <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-full">
                                    <Input
                                        id="contactName"
                                        readOnly={!isEditingName}
                                        className={!isEditingName ? "cursor-not-allowed" : "pr-16"}
                                        {...register("contactName")}
                                    />
                                    {isEditingName && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none bg-background pl-1">
                                            {watch("contactName")?.length || 0}/300
                                        </div>
                                    )}
                                </div>
                                <Button type="button" variant={isEditingName ? "default" : "outline"} className="whitespace-nowrap" onClick={() => setIsEditingName(!isEditingName)}>
                                    {isEditingName ? "Save" : "Edit"}
                                </Button>
                            </div>
                            {errors.contactName && <p className="text-red-500 text-sm mt-1">{errors.contactName.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="mobileNumber" className="mb-2 block">
                                Mobile Number <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    maxLength={10}
                                    placeholder="Enter 10-digit mobile number"
                                    className="pr-16"
                                    onInput={(e: any) => (e.target.value = e.target.value.replace(/\D/g, ""))}
                                    {...register("mobileNumber")}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none bg-background pl-1">
                                    {watch("mobileNumber")?.length || 0}/10
                                </div>
                            </div>
                            {errors.mobileNumber && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="placeOfResidence" className="mb-2 block">
                                Place of Residence <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="placeOfResidence"
                                    placeholder="Enter place of residence"
                                    className="pr-16"
                                    {...register("placeOfResidence")}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none bg-background pl-1">
                                    {watch("placeOfResidence")?.length || 0}/50
                                </div>
                            </div>
                            {errors.placeOfResidence && <p className="text-red-500 text-sm mt-1">{errors.placeOfResidence.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="state" className="mb-2 block">
                                State <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="state"
                                    placeholder="Enter state"
                                    className="pr-16"
                                    {...register("state")}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none bg-background pl-1">
                                    {watch("state")?.length || 0}/50
                                </div>
                            </div>
                            {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    <input type="checkbox" id="terms" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Terms & Conditions
                        </a>
                    </Label>
                </div>

                <div className="flex justify-between w-full">
                    <div className="space-x-2">
                        {hasDraft && (
                            <Button onClick={() => {
                                loadDraft();
                                setConfirmLoadDraft(false);
                            }}>
                                Load Draft
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => saveDraft(form.getValues())}
                            disabled={loading}
                        >
                            Save Draft
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" className={`bg-accent hover:bg-accent/90 text-accent-foreground ${!agreeToTerms ? "opacity-50 cursor-not-allowed" : ""}`} disabled={loading || !agreeToTerms}>
                            Proceed Next
                        </Button>
                    </div>

                </div>
            </form>

            {/* Choice dialog */}
            <Dialog open={choiceDialogOpen} onOpenChange={setChoiceDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>How would you like to submit?</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground">Choose whether to submit as an individual or create a team and follow the wizard.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button className="flex-1 rounded-sm" disabled={loading}>
                                Submit as Individual
                            </Button>
                            <Button variant="outline" onClick={startTeamWizard} className="flex-1 rounded-sm" disabled={loading}>
                                Create a Team
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setChoiceDialogOpen(false)} disabled={loading} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={confirmIndividual} disabled={loading} className="w-full sm:w-auto">
                            {loading ? "Submitting..." : "Submit Solution"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Team wizard with steps (no form inputs) */}
            <Dialog
                open={teamWizardOpen}
                onOpenChange={(open) => {
                    if (!open) setWizardStep(1);
                    setTeamWizardOpen(open);
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Team — Step {wizardStep} of 5</DialogTitle>
                    </DialogHeader>

                    <div className="py-4 h-[400px] md:h-[450px] overflow-y-auto">
                        <div className="flex flex-col md:grid md:grid-cols-1 gap-4 md:gap-6 items-center md:items-center">
                            <div className="w-full">
                                <h3 className="text-base md:text-lg font-semibold">{wizardStepContent[wizardStep - 1].title}</h3>
                                <p className="text-xs md:text-sm text-muted-foreground mt-2">{wizardStepContent[wizardStep - 1].text}</p>
                                {/* for step 4 and 5 we keep explanatory bullets */}
                                {wizardStep === 4 && (
                                    <ul className="mt-3 list-disc list-inside text-xs md:text-sm">
                                        <li>{`Open the solution details page.`}</li>
                                        <li>{`Click "Add Team Member" and enter the member's email.`}</li>
                                        <li>{`Invites are sent automatically by the system.`}</li>
                                    </ul>
                                )}

                                {wizardStep === 5 && (
                                    <ul className="mt-3 list-disc list-inside text-xs md:text-sm">
                                        <li>{`Members receive a verification email.`}</li>
                                        <li>{`Once clicked, they'll be added to the team.`}</li>
                                        <li>{`You can manage members from the Team tab.`}</li>
                                    </ul>
                                )}

                            </div>

                            <div className="flex items-center justify-center w-full">
                                <Image
                                    src={wizardStepContent[wizardStep - 1].img}
                                    alt={wizardStepContent[wizardStep - 1].title}
                                    className="w-full max-w-sm md:max-w-md rounded border shadow-sm"
                                    width={500}
                                    height={500}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
                        <div className="w-full sm:w-auto">{wizardStep > 1 && <Button variant="outline" onClick={wizardBack} disabled={loading} className="w-full sm:w-auto">Back</Button>}</div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {wizardStep < 5 && <Button onClick={wizardNext} disabled={loading} className="w-full sm:w-auto">Next</Button>}
                            {wizardStep === 5 && (
                                <Button onClick={confirmTeamSubmit} disabled={loading} className="w-full sm:w-auto">
                                    {loading ? "Submitting..." : "Submit Solution"}
                                </Button>
                            )}
                            {wizardStep <= 4 && <Button variant="ghost" onClick={() => { setTeamWizardOpen(false); setWizardStep(1); }} disabled={loading} className="w-full sm:w-auto">
                                Cancel
                            </Button>}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Team Acknowledgment Dialog */}
            <Dialog open={teamAcknowledgeOpen} onOpenChange={setTeamAcknowledgeOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Team Submission Acknowledgment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Before submitting your team solution, please acknowledge the following:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                            <li>You will be the team leader and responsible for managing team members.</li>
                            <li>You can add team members from the Dashboard after submission.</li>
                            <li>Team members will receive email invitations to join your solution.</li>
                            <li>All team members must verify their email to be added to the team.</li>
                            <li>You can manage team members from the Team tab in your solution details.</li>
                        </ul>
                        <div className="bg-muted p-4 rounded-md">
                            <p className="text-sm font-medium">Important:</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                By clicking &quot;I Acknowledge &amp; Submit&quot;, you confirm that you understand the team submission process and agree to follow the steps outlined in the wizard.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setTeamAcknowledgeOpen(false)}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTeamAcknowledge}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            {loading ? "Submitting..." : "I Acknowledge & Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Final success dialog */}
            <Dialog
                open={finalSuccessOpen}
                onOpenChange={(open) => {
                    if (!open) resetAll();
                    setFinalSuccessOpen(open);
                }}
            >
                <DialogContent className="max-w-lg bg-background">
                    <DialogHeader>
                        <DialogTitle>Solution Submitted</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center">
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="w-6 h-6 text-green-700" />
                        </div>
                        <h3 className="font-semibold text-lg">Solution submitted successfully!</h3>
                        <p className="text-sm text-muted-foreground mt-2">If you chose team mode, follow the dashboard steps shown in the wizard to add members and manage invites.</p>
                        {/* <div className="mt-4">
                            <Image src={uploadedDemoImage} alt="demo" className="mx-auto rounded border max-h-48" width={500} height={500} />
                        </div> */}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => { setFinalSuccessOpen(false); resetAll(); onSubmissionSuccess(); }}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
