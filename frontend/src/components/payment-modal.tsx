"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Download, ExternalLink, CheckCircle } from "lucide-react";
import { useMediaQuery } from "react-responsive";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrCodeImageUrl: string;
    paymentLink: string;
    eventName: string;
    userName: string;
}

export function PaymentModal({
    isOpen,
    onClose,
    qrCodeImageUrl,
    paymentLink,
    eventName,
    userName,
}: PaymentModalProps) {
    const router = useRouter();
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const { toast } = useToast();

    const handleDownloadQR = async () => {
        if (qrCodeImageUrl) {
            try {
                const response = await fetch(qrCodeImageUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobUrl;
                downloadLink.download = `${eventName}_Payment_QR_Code_${userName}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(blobUrl);
                toast({
                    title: "QR Code Downloaded",
                    description: "Your payment QR code has been downloaded successfully.",
                });
            } catch (error) {
                toast({
                    title: "Download Failed",
                    description: "Unable to download the QR code. Please try again.",
                    variant: "destructive",
                });
            }
        } else {
            toast({
                title: "No QR Code",
                description: "QR code is not available for download.",
                variant: "destructive",
            });
        }
    };

    const handleRedirectToPayment = () => {
        if (paymentLink) {
            window.open(paymentLink, "_blank");
            toast({
                title: "Redirecting",
                description: "Opening the payment page in a new tab...",
            });
        } else {
            toast({
                title: "Payment Link Missing",
                description: "No payment link available.",
                variant: "destructive",
            });
        }
    };

    const handlePaymentConfirmed = () => {

        router.push("/"); // redirect to home page
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] h-auto  flex flex-col bg-gradient-to-br from-white to-gray-50 shadow-xl rounded-2xl border border-gray-200">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-2xl font-bold font-headline text-gray-800">
                        One Last Step
                    </DialogTitle>
                    <DialogDescription className=" text-gray-600 leading-relaxed">
                        Secure Your Spot <br />
                        <span className="text-green-600 font-semibold text-lg">
                            Early Bird Offer: ₹3,500
                        </span>{" "}
                        (<span className="line-through text-red-500">Regular ₹4,500</span>)
                        <br />
                        <br />
                        Scan the QR code to complete your payment. We’ll also send a payment
                        link to your email for convenience.
                    </DialogDescription>
                </DialogHeader>

                <p className="text-center font-semibold text-gray-700">Scan to Pay:</p>

                <div className="flex justify-center">
                    {qrCodeImageUrl && (
                        <Image
                            src={qrCodeImageUrl}
                            alt="Payment QR Code"
                            width={200}
                            height={200}
                            className="object-contain rounded-xl shadow-lg border border-gray-200"
                            unoptimized
                        />
                    )}
                </div>

                <div className="card p-4 pt-2 relative bg-green-50 border border-green-300 rounded-xl text-green-800 font-semibold text-left shadow-inner" id="thankYouCard">
                    <p>After payment, you’re all set feel free to explore the website.</p>
                    <br />
                    <div className="absolute right-6 bottom-4"><p>-Thank you!</p></div>
                </div>

                <DialogFooter className="flex flex-col text-center items-center justify-center gap-3 mt-4">
                    {isMobile ? (
                        <Button
                            type="button"
                            onClick={handleRedirectToPayment}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base rounded-xl shadow-md"
                        >
                            <ExternalLink className="mr-2 h-5 w-5" /> Pay Now (Opens in new tab)
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleDownloadQR}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-base rounded-xl shadow-md"
                        >
                            <Download className="mr-2 h-5 w-5" /> Download QR Code
                        </Button>
                    )}

                    <Button
                        type="button"
                        onClick={handlePaymentConfirmed}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-base rounded-xl shadow-md"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Payment Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    );
}
