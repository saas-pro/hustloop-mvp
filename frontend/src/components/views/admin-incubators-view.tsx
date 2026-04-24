"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { VanityUrlInput } from "@/components/ui/vanity-url-input";
import { API_BASE_URL } from "@/lib/api";
import IncubatorDetails from "./incubator-details";

const profileFormSchema = z.object({
    name: z.string().min(1, "Incubator name is required"),
    location: z.string().min(1, "Location is required"),
    contactEmail: z.string().email("Invalid email address"),
    contactPhone: z.string().optional(),
    description: z.string().min(1, "Description is required").max(5000, "Max 5000 characters"),
    notification_email: z.string().email("Invalid email address").min(1, "Notification email is required to alert them"),
    focus: z.array(z.object({ value: z.string().min(1, "Focus area cannot be empty") })).min(1, "Required"),
    socialLinks: z.object({
        website: z.string().url().optional().or(z.literal("")),
        linkedin: z.string().url().optional().or(z.literal("")),
        twitter: z.string().url().optional().or(z.literal("")),
        facebook: z.string().url().optional().or(z.literal("")),
        instagram: z.string().url().optional().or(z.literal("")),
        youtube: z.string().url().optional().or(z.literal("")),
    }),
    metrics: z.object({
        startupsSupported: z.string().min(1, "Required"),
        fundedStartupsPercent: z.string().min(1, "Required"),
        startupsOutsideLocationPercent: z.string().min(1, "Required"),
        totalFundingRaised: z.string().min(1, "Required"),
    }),
    partners: z.array(z.object({ value: z.string().min(1, "Partner cannot be empty") })),
    type: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function AdminIncubatorsView() {
    const { toast } = useToast();
    const [incubators, setIncubators] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectedIncubator, setSelectedIncubator] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleViewDetails = (inc: any) => {
        setSelectedIncubator(inc);
        setIsDetailsOpen(true);
    };

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: "",
            location: "",
            contactEmail: "",
            contactPhone: "",
            description: "",
            notification_email: "",
            focus: [],
            socialLinks: { website: "", linkedin: "", twitter: "", facebook: "", instagram: "", youtube: "" },
            metrics: { startupsSupported: "", fundedStartupsPercent: "", startupsOutsideLocationPercent: "", totalFundingRaised: "" },
            partners: [],
            type: ["Incubator"],
        },
    });

    const { fields: focusFields, append: appendFocus, remove: removeFocus } = useFieldArray({
        name: "focus",
        control: form.control,
    });

    const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
        name: "partners",
        control: form.control,
    });

    const fetchIncubators = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/incubators`);
            const data = await res.json();
            if (res.ok) setIncubators(data.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIncubators();
    }, []);

    const onSubmit = async (data: ProfileFormValues) => {
        try {
            setIsSubmitting(true);
            const payload = {
                ...data,
                focus: data.focus.map(f => f.value),
                partners: data.partners.map(p => p.value),
                type: data.type && data.type.length > 0 ? data.type : ["Incubator"]
            };

            const res = await fetch(`${API_BASE_URL}/api/incubators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Incubator profile created & notified!" });
                setIsOpen(false);
                await fetchIncubators();
                form.reset();
            } else {
                toast({ variant: "destructive", title: "Error", description: result.error || "Failed to create" });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Network Error", description: "Failed to create profile" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/incubators/${itemToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                toast({ title: "Deleted", description: "Incubator profile removed." });
                fetchIncubators();
            } else {
                toast({ variant: "destructive", title: "Error", description: "Could not delete profile" });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Network Error", description: "Could not delete profile" });
        } finally {
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-lg border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold">Incubator Profiles</h2>
                    <p className="text-muted-foreground">Manage and create Incubator profiles on the platform.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-6 rounded-lg">
                        <DialogHeader className="shrink-0 mb-4">
                            <DialogTitle>Create Incubator Profile</DialogTitle>
                            <DialogDescription>
                                Add a new incubator. They will automatically receive a notification email.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="flex-1 px-2">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-2">
                                    <FormField control={form.control} name="notification_email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Notification Email Address *</FormLabel>
                                            <FormControl><Input placeholder="Email to notify..." type="email" {...field} className="border-primary/50" /></FormControl>
                                            <p className="text-xs text-muted-foreground">This email will receive the &quot;Profile Created&quot; notification.</p>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Separator className="my-6" />

                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Incubator Name</FormLabel><FormControl><Input placeholder="e.g., Nexus Hub" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-4">
                                                        {["Incubator", "Accelerator"].map((t) => (
                                                            <label key={t} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                                    checked={Array.isArray(field.value) && field.value.includes(t)}
                                                                    onChange={(e) => {
                                                                        const currentValues = Array.isArray(field.value) ? field.value : [];
                                                                        const newValue = e.target.checked
                                                                            ? [...currentValues, t]
                                                                            : currentValues.filter((v: string) => v !== t);
                                                                        field.onChange(newValue);
                                                                    }}
                                                                />
                                                                <span className="text-sm">{t}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="location" render={({ field }) => (
                                            <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Bangalore, India" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                            <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input placeholder="outreach@incubator.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="contactPhone" render={({ field }) => (
                                            <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input placeholder="+91 9123456789" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Public Description</FormLabel><FormControl><Textarea rows={4} placeholder="Describe your incubator's mission and mandate." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />

                                    <div>
                                        <h3 className="text-lg font-medium mb-3">Focus Areas</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                            {focusFields.map((field, index) => (
                                                <div key={field.id} className="flex items-center gap-2">
                                                    <FormField control={form.control} name={`focus.${index}.value`} render={({ field }) => (
                                                        <FormItem className="flex-grow"><FormControl><Input placeholder="e.g., SaaS" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFocus(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => appendFocus({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Focus Area</Button>
                                        {form.formState.errors.focus?.root && <p className="text-[0.8rem] font-medium text-destructive mt-1">{form.formState.errors.focus.root.message}</p>}
                                    </div>

                                    <Separator />
                                    <h3 className="text-lg font-medium">Metrics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField control={form.control} name="metrics.startupsSupported" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Startups Supported</FormLabel><FormControl><Input placeholder="e.g., 201" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="metrics.fundedStartupsPercent" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Funded Startups (%)</FormLabel><FormControl><Input placeholder="e.g., 40%" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="metrics.startupsOutsideLocationPercent" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Startups Outside (%)</FormLabel><FormControl><Input placeholder="e.g., 41%" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="metrics.totalFundingRaised" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Total Funding Raised</FormLabel><FormControl><Input placeholder="e.g., ₹4,854M" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <Separator />
                                    <h3 className="text-lg font-medium">Public Links</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="socialLinks.website" render={({ field }) => {
                                            const baseUrl = "https://";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : (val.startsWith("http://") ? val.slice(7) : val);
                                            return (
                                                <FormItem><FormLabel>Website URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="yourwebsite.com" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                        <FormField control={form.control} name="socialLinks.linkedin" render={({ field }) => {
                                            const baseUrl = "https://linkedin.com/in/";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : val;
                                            return (
                                                <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="username" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                        <FormField control={form.control} name="socialLinks.twitter" render={({ field }) => {
                                            const baseUrl = "https://x.com/";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : val;
                                            return (
                                                <FormItem><FormLabel>Twitter/X URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="username" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                        <FormField control={form.control} name="socialLinks.facebook" render={({ field }) => {
                                            const baseUrl = "https://facebook.com/";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : val;
                                            return (
                                                <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="username" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                        <FormField control={form.control} name="socialLinks.instagram" render={({ field }) => {
                                            const baseUrl = "https://instagram.com/";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : val;
                                            return (
                                                <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="username" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                        <FormField control={form.control} name="socialLinks.youtube" render={({ field }) => {
                                            const baseUrl = "https://youtube.com/@";
                                            const val = field.value || "";
                                            const displayValue = val.startsWith(baseUrl) ? val.slice(baseUrl.length) : val;
                                            return (
                                                <FormItem><FormLabel>YouTube URL</FormLabel><FormControl><VanityUrlInput baseUrl={baseUrl} placeholder="channel" value={displayValue} onChange={(v) => field.onChange(v ? baseUrl + v : "")} /></FormControl><FormMessage /></FormItem>
                                            );
                                        }} />
                                    </div>

                                    <Separator />
                                    <h3 className="text-lg font-medium mb-3">Recognised and Funded by</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                        {partnerFields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                                <FormField control={form.control} name={`partners.${index}.value`} render={({ field }) => (
                                                    <FormItem className="flex-grow"><FormControl><Input placeholder="e.g., MeitY" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removePartner(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => appendPartner({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Agency</Button>

                                    <Button type="submit" disabled={isSubmitting} className="w-full mt-4 h-12 text-lg">
                                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Submit Incubator & Send Notification"}
                                    </Button>
                                </form>
                            </Form>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="flex flex-col border border-border bg-card">
                            <CardHeader className="pb-3">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent className="space-y-4 flex-grow">
                                <Skeleton className="h-16 w-full" />
                                <div className="space-y-2 pt-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </CardContent>
                            <CardContent className="flex justify-end mt-auto border-t p-4 border-border/50">
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : incubators.length === 0 ? (
                <Card className="text-center p-12 border-dashed bg-card/50">
                    <CardHeader>
                        <CardTitle>No Incubators</CardTitle>
                        <CardDescription>Click the button above to create an incubator profile.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {incubators.map((inc) => (
                        <Card key={inc._id || inc.id} className="cursor-pointer flex flex-col border border-border bg-card hover:bg-muted/10 transition-colors group relative overflow-hidden shadow-sm hover:shadow-md" onClick={() => handleViewDetails(inc)}>
                            <CardHeader className="pb-3">
                                <CardTitle className="truncate text-lg">{inc.name}</CardTitle>
                                <CardDescription className="flex justify-between items-center text-xs">
                                    <span>{inc.location || "No location provided"}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-grow">
                                <p className="text-sm line-clamp-3 text-muted-foreground">{inc.description}</p>
                                <div className="text-xs space-y-1">
                                    <p><strong className="text-foreground font-headline">Email:</strong> {inc.contactEmail}</p>
                                    <p><strong className="text-foreground font-headline">Startups:</strong> {inc.metrics?.startupsSupported || "N/A"}</p>
                                    {inc.socialLinks?.website && <p><strong className="text-foreground font-headline">Website:</strong> <a href={inc.socialLinks.website} target="_blank" rel="noreferrer" className="text-primary hover:underline group-hover:underline truncate max-w-[200px] inline-block align-bottom">{inc.socialLinks.website}</a></p>}
                                </div>
                            </CardContent>
                            <CardContent className="flex justify-end pt-0 mt-auto border-t p-4 border-border/50 relative z-10">
                                <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setItemToDelete(inc._id || inc.id); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <IncubatorDetails
                incubator={selectedIncubator}
                onOpenChange={(isOpen) => {
                    setIsDetailsOpen(isOpen);
                    if (!isOpen) setSelectedIncubator(null);
                }}
                isLoggedIn={true}
                hasSubscription={true}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this incubator profile.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmDelete}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
