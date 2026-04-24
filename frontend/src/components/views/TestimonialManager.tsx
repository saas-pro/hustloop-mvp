import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MoreVertical, Pencil, Trash2, Mail, Copy } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';

interface Testimonial {
    id: number;
    name: string;
    role: string;
    content: string;
    avatar?: string;
    rating: number;
    status: 'ACTIVE' | 'HIDDEN';
    created_at: string;
}

interface TestimonialRequest {
    id: string;
    email: string;
    token: string;
    expires_at: string;
    is_used: boolean;
    created_at: string;
    recipient_name?: string;
    sent_count: number;
    last_sent_at?: string;
    status: 'pending' | 'sent' | 'failed';
}

export function TestimonialManager() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [testimonialRequests, setTestimonialRequests] = useState<TestimonialRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'testimonials' | 'requests'>('testimonials');
    const [isResending, setIsResending] = useState<string | null>(null);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        content: '',
        rating: 5,
        avatar: '',
        status: 'ACTIVE' as 'ACTIVE' | 'HIDDEN'
    });
    const [requestForm, setRequestForm] = useState({
        email: '',
        message: 'We would love to hear your feedback about our service!'
    });
    
    // Fetch testimonials and requests
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                setIsLoading(true);
                const [testimonialsRes, requestsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/admin/testimonials`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }),
                    fetch(`${API_BASE_URL}/api/admin/testimonial-requests`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                ]);

                if (!testimonialsRes.ok) throw new Error('Failed to fetch testimonials');
                const testimonialsData = await testimonialsRes.json();
                setTestimonials(testimonialsData);

                if (requestsRes.ok) {
                    const requestsData = await requestsRes.json();
                    setTestimonialRequests(requestsData.requests || []);
                }

            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to load data',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const fecthRequest = async()=>{
        const token = localStorage.getItem('token');
        const requests = await fetch(`${API_BASE_URL}/api/admin/testimonial-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        const requestsData = await requests.json();
        setTestimonialRequests(requestsData.requests || []);
        setIsLoading(false);
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, status: checked ? 'ACTIVE' : 'HIDDEN' }));
    };

    const handleRatingChange = (rating: number) => {
        setFormData(prev => ({ ...prev, rating }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            role: '',
            content: '',
            rating: 5,
            avatar: '',
            status: 'ACTIVE'
        });
        setEditingTestimonial(null);
    };

    const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setRequestForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingTestimonial
            ? `${API_BASE_URL}/api/admin/testimonials/${editingTestimonial.id}`
            : `${API_BASE_URL}/api/admin/testimonials`;
        const method = editingTestimonial ? 'PUT' : 'POST';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to save testimonial');
            }

            const result = await response.json();
            if (editingTestimonial) {
                setTestimonials(testimonials.map(t => t.id === result.id ? result : t));
            } else {
                setTestimonials([result, ...testimonials]);
            }

            toast({
                title: 'Success',
                description: `Testimonial ${editingTestimonial ? 'updated' : 'created'} successfully`,
            });
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save testimonial',
                variant: 'destructive',
            });
        }
    };

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingRequest(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/testimonials/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: requestForm.email })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to send testimonial request');
            }

            const result = await response.json();

            await fecthRequest();

            toast({
                title: 'Success',
                description: 'Testimonial request sent successfully',
            });
            setIsRequestDialogOpen(false);
            setRequestForm(prev => ({ ...prev, email: '' }));
            setActiveTab('requests');
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to send testimonial request',
                variant: 'destructive',
            });
        } finally {
            setIsSendingRequest(false);
        }
    };

    const handleDeleteClick = (id: number) => {
        setTestimonialToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!testimonialToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/testimonials/${testimonialToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to delete testimonial');
            }

            setTestimonials(testimonials.filter(t => t.id !== testimonialToDelete));
            toast({
                title: 'Success',
                description: 'Testimonial deleted successfully',
            });
            setDeleteDialogOpen(false);
            setTestimonialToDelete(null);
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete testimonial',
                variant: 'destructive',
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied!',
            description: 'Link copied to clipboard',
        });
    };

    const handleResendRequest = async (requestId: string) => {
        setIsResending(requestId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/testimonial-requests/${requestId}/resend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to resend testimonial request');
            }

            const result = await response.json();
            
            // Update the request in the state
            setTestimonialRequests(prev => 
                prev.map(req => 
                    req.id === requestId 
                        ? { 
                            ...req, 
                            sent_count: result.sent_count, 
                            last_sent_at: new Date().toISOString(),
                            status: 'sent'
                        } 
                        : req
                )
            );

            toast({
                title: 'Success',
                description: 'Testimonial request resent successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to resend testimonial request',
                variant: 'destructive',
            });
        } finally {
            setIsResending(null);
        }
    };

    const filteredTestimonials = testimonials.filter(testimonial =>
        testimonial.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testimonial.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testimonial.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRequests = testimonialRequests.filter(request =>
        request?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    );

    const isRequestValid = (request: TestimonialRequest) => {
        return !request.is_used && new Date(request.expires_at) > new Date();
    };

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Skeleton className="h-10 w-full sm:w-96" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-6 space-y-4">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Skeleton key={star} className="h-5 w-5 rounded-full" />
                                    ))}
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 border-b">
                <button
                    onClick={() => setActiveTab('testimonials')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'testimonials'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Testimonials
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'requests'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Requests
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={`Search ${activeTab}...`}
                        className="pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsDialogOpen(true);
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Testimonial
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsRequestDialogOpen(true)}
                        className="gap-2"
                    >
                        <Mail className="h-4 w-4" />
                        Request
                    </Button>
                </div>
            </div>

            {activeTab === 'testimonials' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTestimonials.map((testimonial) => (
                        <div key={testimonial.id} className="border rounded-lg p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                                        {testimonial.avatar ? (
                                            <Image
                                                src={testimonial.avatar}
                                                alt={testimonial.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                                                {testimonial.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{testimonial.name}</h4>
                                            <Badge
                                                variant={testimonial.status === 'ACTIVE' ? 'default' : 'outline'}
                                                className="text-xs"
                                            >
                                                {testimonial.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Actions</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEditingTestimonial(testimonial);
                                                setFormData({
                                                    name: testimonial.name,
                                                    role: testimonial.role,
                                                    content: testimonial.content,
                                                    avatar: testimonial.avatar || '',
                                                    rating: testimonial.rating,
                                                    status: testimonial.status
                                                });
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleDeleteClick(testimonial.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="space-y-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`text-2xl ${star <= testimonial.rating ? 'text-yellow-400' : 'text-gray-300'
                                                }`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {testimonial.content}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(testimonial.created_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => {
                        const isValid = isRequestValid(request);
                        return (
                            <div
                                key={request.id}
                                className="border rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="font-medium">
                                                {request.recipient_name || request.email}
                                            </p>
                                            <Badge
                                                variant={
                                                    request.status === 'sent' 
                                                        ? 'default'
                                                        : request.status === 'failed'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                            >
                                                {request.status}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    !isValid
                                                        ? 'destructive'
                                                        : request.is_used
                                                            ? 'secondary'
                                                            : 'default'
                                                }
                                            >
                                                {request.is_used
                                                    ? 'Used'
                                                    : !isValid
                                                        ? 'Expired'
                                                        : 'Active'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            {request.recipient_name ? request.email : ''}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>Sent: {request.sent_count} time{request.sent_count !== 1 ? 's' : ''}</span>
                                            {request.last_sent_at && (
                                                <span>Last sent: {format(new Date(request.last_sent_at), 'MMM d, yyyy')}</span>
                                            )}
                                            <span>Expires: {format(new Date(request.expires_at), 'MMM d, yyyy')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleResendRequest(request.id)}
                                            disabled={isResending === request.id}
                                            className="gap-2"
                                        >
                                            {isResending === request.id ? (
                                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Mail className="h-4 w-4" />
                                            )}
                                            {isResending === request.id ? 'Resending...' : 'Resend'}
                                        </Button>
                                        {isValid && !request.is_used && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const link = `https://hustloop.com/submit-testimonial?token=${request.token}`;
                                                    copyToClipboard(link);
                                                }}
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy Link
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Testimonial Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role/Position</Label>
                            <Input
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Testimonial</Label>
                            <Textarea
                                id="content"
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                rows={4}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rating</Label>
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="text-2xl focus:outline-none"
                                        onClick={() => handleRatingChange(star)}
                                    >
                                        <span
                                            className={
                                                star <= formData.rating
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                            }
                                        >
                                            ★
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar">Avatar URL (Optional)</Label>
                            <Input
                                id="avatar"
                                name="avatar"
                                type="url"
                                value={formData.avatar}
                                onChange={handleInputChange}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="space-y-1">
                                <Label htmlFor="status">Status</Label>
                                <p className="text-sm text-muted-foreground">
                                    {formData.status.toUpperCase() === 'ACTIVE'
                                        ? 'This testimonial will be visible on the website'
                                        : 'This testimonial will be hidden from the website'}
                                </p>
                            </div>
                            <Switch
                                id="status"
                                checked={formData.status.toUpperCase() === 'ACTIVE'}
                                onCheckedChange={handleStatusChange}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingTestimonial ? 'Update' : 'Create'} Testimonial
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Request Testimonial Dialog */}
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Testimonial</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Recipient Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={requestForm.email}
                                onChange={handleRequestInputChange}
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Custom Message (Optional)</Label>
                            <Textarea
                                id="message"
                                name="message"
                                value={requestForm.message}
                                onChange={handleRequestInputChange}
                                rows={4}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRequestDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSendingRequest}>
                                {isSendingRequest ? (
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                    <Mail className="mr-2 h-4 w-4" />
                                )}
                                {isSendingRequest ? 'Sending...' : 'Send Request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Testimonial</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete this testimonial? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setTestimonialToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}