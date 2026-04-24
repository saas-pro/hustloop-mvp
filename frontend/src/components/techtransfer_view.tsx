import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Check, Info, Paperclip } from 'lucide-react';
import { MarkdownViewer } from './ui/markdownViewer';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DialogHeader, DialogFooter } from './ui/dialog';


interface TechTransferViewProps {
  techId: String;
  onClose: () => void;
}

interface IPDetails {
  firstName: string;
  lastName: string;
  id: string;
  ipTitle: string;
  describetheTech: string;
  summary: string;
  approvalStatus: string;
  name: string;
  organization: string;
  supportingFileUrl: string | string[];
}

interface TechContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  techtransferId: string;
  techtransferName: string;
}

const TechContactModal = ({ isOpen, onClose, techtransferId, techtransferName }: TechContactModalProps) => {
  const [loading, setLoading] = useState(false);
  const [who, setWho] = useState("");
  const [formData, setFormData] = useState({
    requester_name: "",
    requester_email: "",
    contact_number: "",
    purpose: "",
    company_name: "",
    who_other: "",
  });

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    if (value.length <= 10) { // Limit to 15 digits
      setFormData(prev => ({ ...prev, contact_number: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (who === "Company" && !formData.company_name) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tech-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          techtransfer_id: techtransferId,
          techtransfer_name: techtransferName,
          who: who,
          ...formData,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: data.message });
        onClose();
      } else {
        toast({ title: "Error", description: data.error || "Failed to send inquiry", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="req_name">Full Name <span className="text-red-500">*</span></Label>
              <div className='relative'>
                <Input
                  id="req_name"
                  required
                  maxLength={50}
                  placeholder="John Doe"
                  value={formData.requester_name}
                  onChange={(e) => setFormData({ ...formData, requester_name: e.target.value.slice(0, 50) })}
                />
                <span className="text-xs text-muted-foreground absolute top-3 right-2">
                  {formData.requester_name.length}/50
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="req_email">Email Address <span className="text-red-500">*</span></Label>
              </div>
              <div className='relative'>
                <Input
                  id="req_email"
                  type="email"
                  required
                  maxLength={100}
                  placeholder="john@example.com"
                  value={formData.requester_email}
                  onChange={(e) => setFormData({ ...formData, requester_email: e.target.value.slice(0, 100) })}
                />
                <span className="text-xs text-muted-foreground absolute top-3 right-2">
                  {formData.requester_email.length}/100
                </span>
              </div>

            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tt_id">Tech Transfer ID</Label>
            <Input id="tt_id" value={techtransferId} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tt_name">Tech Transfer Name</Label>
            <Input id="tt_name" value={techtransferName} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="who">Who are you? <span className="text-red-500">*</span></Label>
            <Select onValueChange={setWho} required>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Researcher">Researcher</SelectItem>
                <SelectItem value="Company">Company</SelectItem>
                <SelectItem value="Other">Other (please specify)</SelectItem>
              </SelectContent>
            </Select>
            {who === "Other" && (
              <div className="relative">
                <Input
                  id="who_other"
                  placeholder="Please specify your role"
                  value={formData.who_other}
                  onChange={(e) => setFormData({ ...formData, who_other: e.target.value })}
                  required
                  className="mt-2"
                  maxLength={100}
                />
                <span className="text-xs text-muted-foreground absolute top-3 right-2">
                  {formData.who_other.length}/100
                </span>
              </div>
            )}
          </div>
          {who === "Company" && (
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="company_name">Company Name <span className="text-red-500">*</span></Label>
                <span className="text-xs text-muted-foreground">
                  {formData.company_name.length}/100
                </span>
              </div>
              <div className='relative'>
                <Input
                  id="company_name"
                  required
                  maxLength={100}
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value.slice(0, 100) })}
                />
                <span className="text-xs text-muted-foreground absolute top-3 right-2">
                  {formData.company_name.length}/100
                </span>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="contact_number">Contact Number (optional)</Label>
            </div>
            <div className='relative'>
              <Input
                id="contact_number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1234567890"
                value={formData.contact_number}
                onChange={handleContactNumberChange}
              />
              <span className="text-xs text-muted-foreground absolute top-3 right-2">
                {formData.contact_number.length}/10
              </span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="purpose">What is the purpose? <span className="text-red-500">*</span></Label>
            <div className='relative'>
              <Textarea
                id="purpose"
                required
                maxLength={1000}
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="min-h-[100px] pr-12"
              />
              <span className="text-xs text-muted-foreground absolute bottom-1 right-3">
                {formData.purpose.length}/1000
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className='w-full'>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TechTransfer = ({ techId, onClose }: TechTransferViewProps) => {
  const [ipDetails, setIpDetails] = useState<IPDetails | null>(null);
  const [isFetchingIpDetails, setIsFetchingIpDetails] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    onClose();
  }, [onClose]);


  useEffect(() => {
    const fetchIpDetails = async () => {
      setIsFetchingIpDetails(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/getTechTransfer?id=${techId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setIpDetails(data.message.ips[0]);
        } else {
          toast({
            title: 'Failed to load IP details',
            description: 'Unknown error occurred',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Something went wrong while loading IP details.',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingIpDetails(false);
      }
    };
    fetchIpDetails();
  }, [techId]);


  const getFileNameFromUrl = (url: string) => {
    try {
      const dispositionMatch = url.match(/filename%3D%22([^%]+)%22/);
      if (dispositionMatch && dispositionMatch[1]) {
        return decodeURIComponent(dispositionMatch[1]);
      }
      const pathPart = url.split("?")[0];
      return pathPart.split("/").pop() || url;
    } catch {
      return url;
    }
  };

  const renderFileAttachment = (fileURL: string, fileName: string) => (
    <a
      href={fileURL}
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 mt-2 border border-dashed rounded-md bg-accent/30 hover:bg-accent transition-colors"
    >
      <Paperclip className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm text-primary truncate">
        {getFileNameFromUrl(fileURL) || 'Attached File'}
      </span>
      <span className="text-xs text-muted-foreground ml-auto">
        (Click to View)
      </span>
    </a>
  );


  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      if (!open) {
        handleCloseDialog();
      }
      setIsDialogOpen(open);
    }} >
      <DialogContent
        className={`
                    flex flex-col border bg-background transition-all duration-500 p-0 md:w-[90vw] md:max-w-[90vw] shadow-lg text-base fixed h-[90vh] rounded-lg top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                `} >
        <div className="flex justify-between items-center p-4 pr-14 rounded-t-lg border-b bg-muted/50 dark:bg-muted/20 flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {ipDetails?.ipTitle}
          </DialogTitle>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex justify-center mx-4 mt-2">
            <TabsList className="w-fit">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="absolute bottom-4 right-4 z-10">
            <Button 
              onClick={() => setIsContactModalOpen(true)} 
              className="bg-primary hover:bg-primary/90 shadow-lg"
            >
              Contact Us
            </Button>
          </div>
          
          <TabsContent value="overview" className="flex-grow overflow-y-auto p-4 pb-16 space-y-4 mt-0">

            {ipDetails && (
              <Card className="mb-0 border-primary/50 bg-primary-foreground/20">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg font-extrabold text-primary flex items-center">
                    <Info className="h-5 w-5 mr-2" />
                    {ipDetails.ipTitle}
                  </CardTitle>
                  {ipDetails?.approvalStatus === "approved" && (
                    <span className="flex items-center justify-center w-6 h-6  rounded-full">
                      <Image src="/bluetick.png" alt="bluetick" height={20} width={20} />
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm">
                  <div className='py-2 '>
                    <h1 className='text-lg'>
                      Summary:
                    </h1>
                    <div className='p-2'>
                      <p>{ipDetails.summary} </p>
                    </div>
                  </div>

                  <h1 className='text-lg'>
                    Described About the Technology:
                  </h1>
                  <div className='p-2'>
                    <MarkdownViewer content={ipDetails.describetheTech} />
                  </div>
                  <p className="mt-1 text-muted-foreground">Submitted By: <span className="font-semibold">{ipDetails.firstName} {ipDetails.lastName}</span> from <span className="italic">{ipDetails.organization}</span></p>

                  {(() => {
                    const files = Array.isArray(ipDetails.supportingFileUrl)
                      ? ipDetails.supportingFileUrl
                      : ipDetails.supportingFileUrl
                        ? [ipDetails.supportingFileUrl]
                        : []

                    if (files.length === 0) return null

                    return (
                      <div className="mt-4 border-t pt-3">
                        <p className="font-medium text-primary-dark mb-2">
                          Attached Submission File{files.length > 1 ? 's' : ''}:
                        </p>

                        <div className="flex flex-col gap-2">
                          {files.map((url, index) => (
                            <div key={index}>
                              {renderFileAttachment(url, ipDetails.ipTitle)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}


                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="faq" className="flex-grow overflow-y-auto p-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What is technology transfer?</AccordionTrigger>
                    <AccordionContent>
                      Technology transfer is the process of transferring scientific findings, innovations, and intellectual property from one organization to another for further development and commercialization. It enables research institutions, universities, and companies to share their technologies with businesses that can bring them to market.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>How does the licensing process work?</AccordionTrigger>
                    <AccordionContent>
                      The licensing process typically involves: (1) Reviewing the technology details and documentation, (2) Submitting an expression of interest, (3) Negotiating terms and conditions with the technology owner, (4) Signing a licensing agreement, and (5) Receiving the necessary documentation and support to implement the technology. The specific timeline and requirements may vary depending on the technology and parties involved.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>What are the terms and conditions?</AccordionTrigger>
                    <AccordionContent>
                      Terms and conditions vary by technology and are negotiated between the licensor and licensee. Common terms include licensing fees, royalty rates, exclusivity rights, territory restrictions, duration of the license, and performance milestones. All terms are documented in a formal licensing agreement that protects both parties&apos; interests.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>How can I contact the technology owner?</AccordionTrigger>
                    <AccordionContent>
                      You can contact the technology owner through the Hustloop platform by expressing your interest in the technology. The platform will facilitate communication between you and the technology owner. For additional support, you can reach out to our team at support[@]hustloop.com.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>What support is provided after licensing?</AccordionTrigger>
                    <AccordionContent>
                      Post-licensing support varies by agreement but typically includes technical documentation, training materials, and consultation with the technology developers. Some licenses may include ongoing technical support, updates, and improvements. The specific support terms are outlined in the licensing agreement and can be customized based on your needs.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      {ipDetails && (
        <TechContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          techtransferId={techId.toString()}
          techtransferName={ipDetails.ipTitle}
        />
      )}
    </Dialog>
  )
}

export default TechTransfer