"use client";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Briefcase, PlayCircle, Globe, Award, Link, CheckCircle, GraduationCap, Hexagon, FolderCheck, ArrowRight, Group, Library, TrendingUp, GitBranch, Scaling, Wrench, CircleDollarSign, Handshake, Search, Rocket, Target, Users, Megaphone, Gauge, BrainCircuit, BarChart, ShieldCheck, Heart, BookOpen, Building, Loader2, Send, Linkedin, Mail, Eye, Code, Settings, User, Contact, ChevronDown, HandCoins, Puzzle, Microscope, FileSearch, Layers, Network, Sprout, Instagram, Youtube } from "lucide-react";
import { ReactTyped } from "react-typed";
import { useState, useEffect, useCallback } from "react";
import SolutionCard from '../SolutionCard';
import { cn } from "@/lib/utils";
import * as React from "react";
import type { View } from "@/app/types";
import Footer from "../layout/footer";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { IconCard } from "@/components/ui/icon-card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/providers/AuthContext';
import { API_BASE_URL } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnderlineEffect from "@/components/ui/underline-effect";
import { useRef } from "react";
import HighlightEffect from "@/components/ui/highlight-effect";
import BannerImage from "../ui/BannerImage";
import HanddrawnUnderline from "@/components/ui/handdrawn-underline";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import PricingData from '../BillingCard/billing-card';
import { DashboardTab } from '@/app/types';
import * as THREE from 'three';
import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import Prism from '../Prism';
import { ContainerScroll } from '../ui/container-scroll-animation';
import { TestimonialsMarquee } from "@/components/testimonials-marquee"

const contactFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").max(300, "Full name must not exceed 300 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().max(10, "Phone number must not exceed 10 digits.").optional(),
  subject: z.string({ required_error: "Please select a subject." }),
  message: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message must not exceed 500 characters."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;


const marqueeTabsRow1 = [
  { text: "Venture Capital", icon: <CircleDollarSign className="h-4 w-4 text-green-500" /> },
  { text: "Product-Market Fit" },
  { text: "Seed Funding" },
  { text: "Expert Mentorship", icon: <Users className="h-4 w-4 text-purple-500" /> },
  { text: "Go-to-Market Strategy" },
  { text: "Angel Investors" },
];
const marqueeTabsRow2 = [
  { text: "Growth Hacking" },
  { text: "Pitch Deck Review", icon: <Megaphone className="h-4 w-4" /> },
  { text: "Technical Co-founder" },
  { text: "Agile Development" },
  { text: "Lean Startup" },
];
const marqueeTabsRow3 = [
  { text: "Business Model Canvas" },
  { text: "User Acquisition" },
  { text: "KPIs & Metrics", icon: <Gauge className="h-4 w-4" /> },
  { text: "AI & Machine Learning" },
  { text: "Networking Events", icon: <Handshake className="h-4 w-4 text-blue-500" /> },
];


interface HomeViewProps {
  setActiveTab: (tab: DashboardTab) => void;
  setActiveView: (view: View) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  userRole: string | null;
  navOpen?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}
interface DynamicHeroSection {
  setActiveView: (view: View) => void;
  isLoggedIn: boolean;
  navOpen?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}


const dynamicHeroStates = [
  {
    stage: 'VALIDATE',
    icon: ShieldCheck,
    tags: ["Customer Interviews", "Market Viability", "Proof of Concept", "Feedback Loop"],
    users: [
      { image: "/images/woman writing.jpeg", hint: "woman writing" },
      { image: "/images/man discussing.jpeg", hint: "man discussing" }
    ]
  },
  {
    stage: 'PLAN',
    icon: FolderCheck,
    tags: ["Market Research", "Business Plan", "Financial Modeling", "Competitor Analysis"],
    users: [
      { image: "/images/smiling woman.jpeg", hint: "smiling woman" },
      { image: "/images/smiling man with glasses.jpeg", hint: "smiling man with glasses" }
    ]

  },
  {
    stage: 'BUILD',
    icon: Wrench,
    tags: ["MVP Development", "UI/UX Design", "Agile Sprints", "Beta Testing"],
    users: [
      { image: "/images/person thinking.jpeg", hint: "person thinking" },
      { image: "/images/woman professional.jpeg", hint: "woman professional" }
    ]
  },
  {
    stage: 'LAUNCH',
    icon: Rocket,
    tags: ["Go-to-Market", "User Acquisition", "Growth Hacking", "Pitch Deck"],
    users: [
      { image: "/images/man celebrating.jpeg", hint: "man celebrating" },
      { image: "/images/woman happy.jpeg", hint: "woman happy" }
    ]
  },
  {
    stage: 'SCALE',
    icon: TrendingUp,
    tags: ["Series A Funding", "International Expansion", "Hiring Key Roles", "Optimize Operations"],
    users: [
      { image: "/images/team meeting.jpeg", hint: "team meeting" },
      { image: "/images/ceo portrait.jpeg", hint: "ceo portrait" }
    ]
  }
];

export const solutionSteps = {
  'market-solution': {
    title: 'Market Solutions',
    steps: [
      { icon: Globe, title: "Real-World Challenges", description: "Organisations post pressing industry problems" },
      { icon: Lightbulb, title: "Innovator Solutions", description: "Browse, ideate, and submit breakthrough solutions" },
      { icon: Puzzle, title: "Collaborative MVPs", description: "Work hand-in-hand to co-create minimum viable products" },
      { icon: BarChart, title: "Business Growth", description: "Unlock measurable growth with tested solutions" },
    ]
  },

  'tech-transfer': {
    title: 'Technology Transfer',
    steps: [
      { icon: Microscope, title: "Tech Discovery", description: "Explore cutting-edge university & industry innovations" },
      { icon: FileSearch, title: "IP & Licensing", description: "Review intellectual property and licensing terms" },
      { icon: Layers, title: "Integration", description: "Embed validated technologies into your MVP" },
      { icon: Rocket, title: "Accelerated Development", description: "Boost growth with field-proven solutions" },
    ]
  },
  'valueAddedFeatures': {
    title: 'Value Added Features',
    steps: [
      {
        icon: Sprout,
        title: "Incubation Support",
        description: "Access resources, workspace, and structured programs to nurture early-stage ideas into viable businesses."
      },
      {
        icon: Users,
        title: "Mentor Support",
        description: "Gain guidance from experienced industry experts to refine strategy, avoid pitfalls, and accelerate growth."
      },
      {
        icon: Network,
        title: "Network Support",
        description: "Connect with investors, partners, and peers to expand opportunities and strengthen your market presence."
      },
    ]
  }
};



const WayArrow = () => {
  return (
    <div className="flex justify-center items-center py-8 md:py-12">
      <div className="relative w-full max-w-md">
        <svg
          viewBox="0 0 400 200"
          className="w-full h-auto animate-pulse"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 100,100 C 100,60 60,40 40,40 C 20,40 0,60 0,100 C 0,140 20,160 40,160 C 60,160 100,140 100,100 M 100,100 C 100,60 140,40 160,40 C 180,40 200,60 200,100 C 200,140 180,160 160,160 C 140,160 100,140 100,100"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className="text-accent"
            transform="translate(100, 20) scale(1)"
          />
        </svg>
      </div>
    </div>
  );
};

const BrandLogo = ({ inSheet = false }: { inSheet?: boolean }) => {
  const router = useRouter();
  const handleLogoClick = () => {
    router.push("/");
  };
  return (
    <div
      className="hidden xl:flex justify-left items-center z-[1000] gap-2 absolute top-5 left-4"
      onClick={handleLogoClick}
    >
      <Image
        src="/logo.png"
        alt="Hustloop logo"
        width={120}
        height={120}
        className="w-auto min-w-[120px] max-w-[200px] h-12 md:h-16 object-contain cursor-pointer"
      />
      {!inSheet && (
        <div className="flex items-center gap-2">
          <Separator orientation="vertical" className="h-8 bg-border w-0.5" />
          <p className="text-sm leading-tight text-muted-foreground xl:text-white">
            Smart hustle. <br /> Infinite growth..
          </p>
        </div>
      )}
    </div>
  );
};


const DynamicHeroSection = ({ isLoggedIn, setActiveView, navOpen, scrollContainerRef }: DynamicHeroSection) => {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [themeKey, setThemeKey] = useState(0);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Track scroll progress from the container
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.4], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.4], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.4], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.4], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.4], [0, 1.2]);

  const videoOpacityTransform = useTransform(scrollYProgress, [0, 0.5], [0.98, 0]);
  const videoDisplayTransform = useTransform(scrollYProgress, (value) => (value > 0.1 ? 'none' : navOpen ? 'none' : 'block'));
  const heroOverlayOpacityTransform = useTransform(scrollYProgress, [0, 0.15], [0.42, 0]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(prev => prev + 1);
    });

    const targetNode = document.documentElement || document.body;
    observer.observe(targetNode, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStateIndex((prevIndex) => (prevIndex + 1) % dynamicHeroStates.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!vantaRef.current) return;

    const loadVanta = async () => {
      try {
        if (typeof window !== 'undefined') {
          (window as any).THREE = THREE;
        }

        const VANTA = await import('vanta/dist/vanta.dots.min');

        const heroSection = document.getElementById('hero');
        const computedStyle = heroSection ? window.getComputedStyle(heroSection) : null;
        const bgColor = computedStyle?.backgroundColor || 'rgb(255, 255, 255)';

        const rgbMatch = bgColor.match(/\d+/g);
        const backgroundColor = rgbMatch
          ? parseInt(rgbMatch[0]) * 65536 + parseInt(rgbMatch[1]) * 256 + parseInt(rgbMatch[2])
          : 0xffffff;

        const accentElement = document.createElement('div');
        accentElement.className = 'bg-accent';
        document.body.appendChild(accentElement);
        const accentColor = window.getComputedStyle(accentElement).backgroundColor;
        document.body.removeChild(accentElement);

        const accentRgbMatch = accentColor.match(/\d+/g);
        const dotColor = accentRgbMatch
          ? parseInt(accentRgbMatch[0]) * 65536 + parseInt(accentRgbMatch[1]) * 256 + parseInt(accentRgbMatch[2])
          : 0xdebb64;

        vantaEffect.current = (VANTA as any).default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 2.00,
          scaleMobile: 2.00,
          size: 2.50,
          spacing: 25.00,
          showLines: false,
          backgroundColor: backgroundColor,
          color: dotColor,
        });
      } catch (error) {
        console.error('Failed to load Vanta effect:', error);
      }
    };

    loadVanta();

    let debounceTimer: NodeJS.Timeout;
    const observer = new MutationObserver(() => {

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (vantaEffect.current) {
          const heroSection = document.getElementById('hero');
          const computedStyle = heroSection ? window.getComputedStyle(heroSection) : null;
          const bgColor = computedStyle?.backgroundColor || 'rgb(255, 255, 255)';

          const rgbMatch = bgColor.match(/\d+/g);
          const newBackgroundColor = rgbMatch
            ? parseInt(rgbMatch[0]) * 65536 + parseInt(rgbMatch[1]) * 256 + parseInt(rgbMatch[2])
            : 0xffffff;

          const accentElement = document.createElement('div');
          accentElement.className = 'bg-accent';
          document.body.appendChild(accentElement);
          const accentColor = window.getComputedStyle(accentElement).backgroundColor;
          document.body.removeChild(accentElement);

          const accentRgbMatch = accentColor.match(/\d+/g);
          const newDotColor = accentRgbMatch
            ? parseInt(accentRgbMatch[0]) * 65536 + parseInt(accentRgbMatch[1]) * 256 + parseInt(accentRgbMatch[2])
            : 0xdebb64;


          if (vantaEffect.current.options) {
            vantaEffect.current.options.backgroundColor = newBackgroundColor;
            vantaEffect.current.options.color = newDotColor;
          }


          if (vantaEffect.current.setOptions) {
            vantaEffect.current.setOptions({
              backgroundColor: newBackgroundColor,
              color: newDotColor,
            });
          }
        }
      }, 100);
    });

    const targetNode = document.documentElement || document.body;
    observer.observe(targetNode, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, [themeKey]);

  // Commented out video observer since we're using Google Gemini Effect now
  // useEffect(() => {
  //   const hero = document.getElementById("hero") as HTMLElement | null;
  //   const video = hero?.querySelector("video") as HTMLVideoElement | null;

  //   if (!hero || !video) return;

  //   const observer = new IntersectionObserver(
  //     ([entry]) => {
  //       video.style.opacity = entry.isIntersecting ? "1" : "0";
  //       video.style.transition = "opacity 0.5s ease";
  //     },
  //     { threshold: 0.5 }
  //   );

  //   observer.observe(hero);
  // }, []);


  return (
    <section
      ref={heroRef}
      className={`hidden-scroll h-[100vh] md:h-[100vh] relative bg-background w-full`}
      id="hero"
    >
      <motion.div
        className="hidden xl:block absolute inset-0 bg-black z-10 pointer-events-none"
        style={{
          opacity: heroOverlayOpacityTransform
        }}
      />


      <div className="hidden xl:block absolute top-0 left-0 w-full h-full z-0 bg-accent opacity-0 transition-opacity duration-1000 animate-in fade-in" />

      {/* Lightweight Prism for mobile, full effect on tablet/desktop */}
      <div className="xl:hidden absolute top-0 left-0 w-full h-full z-[1]">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          bloom={0.6}
          suspendWhenOffscreen={false}
          height={3.5}
          baseWidth={5.5}
          scale={4}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />

      </div>
      {/* <div className="hidden md:block xl:hidden absolute top-0 left-0 w-full h-full z-[1]">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div> */}


      {/* Commented out video - using Google Gemini Effect instead */}
      <div className='hidden xl:block w-full'>
        <motion.video
          autoPlay
          loop
          muted
          preload="auto"
          playsInline
          ref={(el: HTMLVideoElement | null) => {
            if (el && el.paused) {
              el.play().catch(() => { });
            }
          }}
          onLoadedData={() => { window.dispatchEvent(new Event('app-video-loaded')) }}
          onCanPlay={() => { window.dispatchEvent(new Event('app-video-loaded')) }}
          className="hidden absolute top-0 left-0 w-full h-full object-cover z-0 xl:block"
          style={{
            opacity: navOpen ? 1 : videoOpacityTransform,
          }}
        >
          <source src="/video/HeaderVideo.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </motion.video>
      </div>
      {/* Google Gemini Effect for desktop */}
      {/* <motion.div
        className="block absolute top-0 left-0 w-full h-full z-0"
        style={{
          opacity: navOpen ? 0 : useTransform(scrollYProgress, [0, 0.15], [1, 0])
        }}
      >
        <GoogleGeminiEffect
          pathLengths={[
            pathLengthFirst,
            pathLengthSecond,
            pathLengthThird,
            pathLengthFourth,
            pathLengthFifth,
          ]}
          className="absolute top-0 left-0 w-full h-full"
        />
      </motion.div> */}

      {/* <motion.div
        className="absolute inset-0 bg-black z-50 hidden md:block"
        style={{
          opacity: navOpen ? 1 : useTransform(scrollYProgress, [0, 0.15], [0, 1])
        }}
      ></motion.div> */}

      <BrandLogo />

      <section className="relative text-center text-current w-full xl:text-left z-20 h-screen flex flex-col xl:flex-row items-center justify-center">
        <div className="xl:flex-1 flex-0 xl:text-left relative xl:left-16 xl:top-4">
          <h1 className="text-5xl lg:text-[60px] xl:text-[80px] font-bold font-headline leading-tight text-current xl:text-white">
            {"Empowering Tomorrow's"}
            <br />
            <span className="relative inline-block text-primary">
              Innovators
              <svg
                className="absolute right-0 mx-auto w-[100px] xl:w-[142px] -bottom-1 xl:-bottom-1 lg:bottom-0"
                aria-hidden="true"
                role="presentation"
                viewBox="0 0 117 72"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ pointerEvents: "none" }}
              >
                <path
                  d="M6.52643 7.99766C4.94183 5.69998 2.85228 3.68244 1 1.59863M109.77 14.3969C110.378 13.7416 110.937 13.0433 111.515 12.3608M68 9.00049C68.2139 6.63002 68.6547 4.31683 69 2.00049M17.8709 63.5527C15.6537 64.3763 13.7205 66.0614 11.7627 67.334M70 65.0005C70.3433 66.9512 70.6707 68.9328 71 71.0005M111.806 56.8633C113.335 57.5003 114.724 58.3876 116.169 59.1902"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>

          </h1>

          <span className="block text-3xl lg:text-6xl xl:text-6xl font-headline mt-4 text-current xl:text-white">
            The Hustloop
          </span>

          <div className="block text-4xl lg:text-6xl xl:text-8xl font-headline leading-tight text-current xl:text-white">
            <span>for </span>
            <ReactTyped
              strings={[
                "Founders",
                "Innovators",
                "Students",
                "Organisations",
                "Incubators",
                "Startups",
                "Enablers",
                "Mentors",
              ]}
              typeSpeed={60}
              backSpeed={35}
              backDelay={1200}
              loop
              smartBackspace
              cursorChar="|"
              className="bg-primary bg-clip-text text-transparent"
            />
          </div>

          {isLoggedIn ? (
            <Button
              size="lg"
              className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => setActiveView("dashboard")}
            >
              Explore Dashboard
            </Button>
          ) : (
            <Button
              size="lg"
              className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => setActiveView("signup")}
            >
              Join a Thriving Ecosystem
            </Button>
          )}
        </div>
      </section>

      <div className="absolute bottom-16 md:bottom-10 w-full flex justify-center z-20 mb-6 md:mb-0">
        <div
          className="flex flex-col items-center text-black xl:text-white"
        >
          <span className="text-base mb-1">Scroll Down</span>
          <svg
            className="w-6 h-6 animate-bounce"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
};



export default function HomeView({
  setActiveTab,
  setActiveView,
  isLoggedIn,
  onLogout,
  userRole,
  navOpen,
  scrollContainerRef
}: HomeViewProps) {
  const { toast } = useToast();
  const { founderRole } = useAuth();
  const router = useRouter();
  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { fullName: "", email: "", phone: "", message: "" },
  });



  const { formState: { isSubmitting: isContactSubmitting }, reset: resetContactForm } = contactForm;

  const [isFounderRole, setIsFounderRole] = useState(false);

  useEffect(() => {
    if (founderRole === "List a technology for licensing") {
      setIsFounderRole(true)
    } else {
      setIsFounderRole(false)
    }
  }, [isFounderRole, isLoggedIn, onLogout, founderRole])

  async function onContactSubmit(data: ContactFormValues) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });


      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Message Sent!",
          description: "Thank you for reaching out. We'll get back to you shortly.",
        });
        resetContactForm();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: result.error || "An unknown error occurred.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not connect to the server. Please try again later.",
      });
    }
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth <= 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const whatWeOffer = [
    {
      icon: <Image src={isMobile ? "/icons/msme-sol.png" : "/icons/msme-sol.gif"} alt="msme" width={100} height={100} />,
      title: "Organisation's Solution",
      description: "Partner with Organisations to solve real business challenges, gain market insights, and unlock growth through crowdsourced innovation."
    },
    {
      icon: <Image src={isMobile ? "/icons/intellectual-tech.png" : "/icons/intellectual-tech.gif"} alt="tech" width={100} height={100} />,
      title: "Technology Transfer",
      description: "Access a curated portfolio of innovative technologies from top research institutions, universities, and industry partners. Easily browse, select, and license solutions through Hustloop to accelerate your growth."
    },
    {
      icon: <Image src={isMobile ? "/icons/corporate-incu.png" : "/icons/corporate-incu.gif"} alt="incubation" width={100} height={100} />,
      title: "Incubation & Innovation Hub",
      description: "Connect with leading incubators and industry partners to submit your ideas, access expert mentorship, build your MVP, and accelerate your startup's growth through tailored resources and collaborative opportunities."
    },
    {
      icon: <Image src={isMobile ? "/icons/mentor.png" : "/icons/mentor.gif"} alt="mentor" width={100} height={100} />,
      title: "Mentor Network",
      description: "Engage with experienced mentors, host or join sessions, and receive personalized guidance tailored to your entrepreneurial journey."
    },
    {
      icon: <Image src={isMobile ? "/icons/book.png" : "/icons/book.gif"} alt="learning" width={100} height={100} />,
      title: "Learning Sessions",
      description: "Participate in regular workshops, webinars, and expert-led sessions to stay updated on trends and best practices."
    },
    {
      icon: <Image src={isMobile ? "/icons/organigram.png" : "/icons/organigram.gif"} alt="networking" width={100} height={100} />,
      title: "Exclusive Networking",
      description: "Join curated events to connect with founders, investors, Organisations, and industry leaders, expanding your professional network."
    }
  ];



  const [isPausedRow1, setPausedRow1] = useState(false);
  const [isPausedRow2, setPausedRow2] = useState(false);
  const [isPausedRow3, setPausedRow3] = useState(false);

  // Removed complex scroll-linked scaling to fix scroll lag
  const journeyRef = useRef<HTMLDivElement | null>(null);
  const journeyPanelRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const section = journeyRef.current;
    if (!section) return;

    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-journey-card]"));
    if (cards.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      cards.forEach((c) => c.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            target.classList.add("in-view");
            observer.unobserve(target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.2,
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  // Prevent scrolling when nav is open
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  return (
    <>
      <div
        id='for-nav'
        className={`relative pointer-events-auto w-full bg-background text-foreground [overflow-x:clip] ${navOpen ? "overflow-hidden" : ""}`}
      >
        {/* Hero Section */}
        <section id="hero-section" className={`h-[100vh] md:sticky md:top-0 overflow-hidden ${navOpen ? 'md:relative' : 'md:sticky md:top-0'} `}>
          <DynamicHeroSection setActiveView={setActiveView} isLoggedIn={isLoggedIn} navOpen={navOpen} scrollContainerRef={scrollContainerRef} />
        </section>

        <div
          id="hero-sentinel"
          className="min-h-1"
        />

        {/* Start Your Journey Section with native scroll-based zoom */}
        <motion.div
          className='bg-background rounded-t-2xl relative'
          style={{
            scale: useTransform(
              useScroll({
                target: journeyRef,
                container: scrollContainerRef,
                offset: ["start end", "end start"]
              }).scrollYProgress,
              [0, 0.2, 1],
              [0.8, 1, 1]
            ),
            transformOrigin: "top center"
          }}
        >
          <section ref={journeyRef} className="relative py-14 z-10 w-screen flex cursor-default bg-background rounded-t-2xl" id='second-section'>

            <div className="journey-panel container m-auto flex justify-center items-center flex-col" ref={journeyPanelRef}>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8 font-headline">
                Start your <HighlightEffect> Journey </HighlightEffect>
              </h2>

              {/* Parent container card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 w-full mx-auto pt-2 md:pt-4">

                {/* Card 1 (Founders)*/}
                <Card data-journey-card className="journey-card group text-center p-6 md:p-8 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="mx-auto bg-primary/10 text-primary 
              w-24 h-24 md:w-28 md:h-28 flex items-center justify-center 
              rounded-full overflow-hidden mb-4 
              transition-all duration-300 
              group-hover:scale-110">
                    <Image
                      src={isMobile ? "/icons/inventor.png" : "/icons/inventor.gif"}
                      width={isMobile ? 70 : 100}
                      height={isMobile ? 70 : 100}
                      alt="founders"
                    />
                  </div>
                  <div className='flex-grow'>
                    <h3 className="text-xl font-bold">For Founders</h3>
                    <p className="text-muted-foreground mt-2 mb-4">
                      Register, choose your role, and either submit an innovative idea to an incubation center to get incubated, or offer a technology for transfer.
                    </p>
                  </div>
                  {isFounderRole ? <Button
                    className="bg-secondary text-secondary-foreground hover:text-primary-foreground dark:bg-input"
                    onClick={() => {
                      localStorage.setItem("pendingTab", "engagements");
                      setActiveView("dashboard");
                    }}
                  >
                    Submit Your IP
                  </Button> :
                    <Button
                      className="bg-secondary text-secondary-foreground hover:text-primary-foreground dark:bg-input"
                      onClick={() => setActiveView("incubators")}
                    >
                      Get Started
                    </Button>}
                </Card>

                {/* Card 2 (MSMEs) */}
                <Card data-journey-card className="journey-card group text-center p-6 md:p-8 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="mx-auto bg-primary/10 text-primary 
              w-24 h-24 md:w-28 md:h-28 flex items-center justify-center 
              rounded-full overflow-hidden mb-4 
              transition-all duration-300 
              group-hover:scale-110">
                    <Image
                      src={isMobile ? "/icons/Handshake.png" : "/icons/Handshake.gif"}
                      width={isMobile ? 120 : 120}
                      height={isMobile ? 120 : 120}
                      alt="founders"
                    />
                  </div>
                  <div className='flex-grow'>
                    <h3 className="text-xl font-bold">For Organisations</h3>
                    <p className="text-muted-foreground mt-2 mb-4">
                      Register, post your business challenges, and collaborate with problem solvers.
                    </p>
                  </div>
                  <Button
                    className="bg-secondary text-secondary-foreground hover:text-primary-foreground dark:bg-input"
                    onClick={() => {
                      if (isLoggedIn && userRole === 'organisation') {
                        localStorage.setItem("msmeTabPending", "profile");
                        setActiveView("dashboard");
                      } else if (userRole === 'admin') {
                        setActiveView("browseMSME");
                      } else if (!isLoggedIn) {
                        setActiveView("joinasanMSME");
                      } else {
                        setActiveView('joinasanMSME')
                      }
                    }}
                  >
                    {(userRole === 'organisation' || userRole === 'founder' || userRole === 'incubator' || userRole === 'mentor' || userRole === null)
                      ? "Join as an Organisation"
                      : "Browse Organisations"}
                  </Button>

                </Card>

                {/* Card 3 (Problem Solvers (Innovators) */}
                <Card data-journey-card className="journey-card group text-center p-6 md:p-8 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="mx-auto bg-primary/10 text-primary 
              w-24 h-24 md:w-28 md:h-28 flex items-center justify-center 
              rounded-full overflow-hidden mb-4 
              transition-all duration-300 
              group-hover:scale-110">
                    <Image
                      src={isMobile ? "/icons/problem-solver.png" : "/icons/problem-solver.gif"}
                      width={isMobile ? 70 : 120}
                      height={isMobile ? 70 : 120}
                      alt="founders"
                    />
                  </div>
                  <div className='flex-grow'>
                    <h3 className="text-xl font-bold">Problem Solvers (Innovators)</h3>
                    <p className="text-muted-foreground mt-2 mb-4">
                      Register, browse Organisations problem statements, and submit your solutions.
                    </p>
                  </div>

                  <Button
                    className="bg-secondary text-secondary-foreground hover:text-primary-foreground dark:bg-input"
                    onClick={() => setActiveView("msmes")}
                  >
                    Browse Challenges
                  </Button>
                </Card>


                <Card data-journey-card className="journey-card group text-center p-6 md:p-8 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="mx-auto bg-primary/10 text-primary 
              w-24 h-24 md:w-28 md:h-28 flex items-center justify-center 
              rounded-full overflow-hidden mb-4 
              transition-all duration-300 
              group-hover:scale-110">
                    <Image
                      src={isMobile ? "/icons/patent.png" : "/icons/patent.gif"}
                      width={isMobile ? 70 : 120}
                      height={isMobile ? 70 : 120}
                      alt="founders"
                    />
                  </div>
                  <div className='flex-grow'>
                    <h3 className="text-xl font-bold">Technology Transfer</h3>
                    <p className="text-muted-foreground mt-2 mb-4">
                      Browse and license innovative technologies from universities and industry partners.
                    </p>
                  </div>

                  <Button
                    className="bg-secondary text-secondary-foreground hover:text-primary-foreground dark:bg-input"
                    onClick={() => setActiveView('browseTech')}
                  >
                    Browse Technologies
                  </Button>
                </Card>

              </div>
            </div>
          </section>
        </motion.div>


        {/* What We Offer Section */}
        <section className="relative py-16 md:py-20 cursor-default bg-background">

          <div className="container mx-auto flex justify-center items-center flex-col">
            <h2 className="text-4xl font-bold mb-4 font-headline">What we offer</h2>
            <p className="max-w-2xl mx-auto text-muted-foreground mb-12 text-center">
              A comprehensive suite of services designed to support you at every stage of your entrepreneurial journey.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* First 3 items */}
              {whatWeOffer.map((feature) => (
                <div key={feature.title} className="flex justify-center flex-grow">
                  <IconCard
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    className="h-full w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <SolutionCard solutionSteps={solutionSteps}></SolutionCard>

        <section className='w-full mx-auto'>
          <PricingData setActiveView={setActiveView} />
        </section>


        <section className="relative py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4 relative font-headline flex items-center justify-center gap-1 text-center flex-wrap">
              Why choose
              <span className="inline-flex items-center justify-center relative top-1">
                <Image
                  src="/logo.png"
                  alt="Hustloop logo"
                  width={220}
                  height={220}
                  className="object-contain h-auto max-w-[140px] md:max-w-[140px]"
                />
                <span
                  className="ml-[-4px] text-4xl"
                  style={{ color: '#debb64' }}
                >
                  ?
                </span>
              </span>
            </h2>

            <p className="max-w-3xl mx-auto text-muted-foreground mb-12">
              We are founded on a clear mission, guided by a bold vision, and committed to core values that drive success.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="group text-center p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20">
                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-foreground">
                  <Image src={isMobile ? "/icons/target.png" : "/icons/target.gif"} alt="msme" width={100} height={100} />
                </div>
                <CardTitle className="mb-2 font-headline font-bold">Our Mission</CardTitle>
                <p className="text-muted-foreground">To empower entrepreneurs by providing the resources, guidance, and connections they need to transform innovative ideas into successful ventures.</p>
              </Card>
              <Card className="group text-center p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20">
                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-foreground">
                  <Image src={isMobile ? "/icons/growth.png" : "/icons/growth.gif"} alt="msme" width={100} height={100} />
                </div>
                <CardTitle className="mb-2 font-headline font-bold">Our Vision</CardTitle>
                <p className="text-muted-foreground">To create a thriving ecosystem where startups, Organisations, and incubators collaborate seamlessly to drive innovation and economic growth.</p>
              </Card>
              <Card className="group text-center p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20">
                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-foreground">
                  <Image src={isMobile ? "/icons/diamond.png" : "/icons/diamond.gif"} alt="msme" width={100} height={100} />
                </div>
                <CardTitle className="mb-2 font-headline font-bold">Our Values</CardTitle>
                <p className="text-muted-foreground">Innovation, collaboration, integrity, and excellence guide everything we do as we help shape the future of entrepreneurship.</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Our Users Say
              </h2>
              <p className="text-muted-foreground">
                Join thousands of satisfied users who have transformed their workflow with Hustloop.
              </p>
            </div>
            <TestimonialsMarquee />
          </div>
        </section>

        {/* 5-Minute Tour Section */}
        <section className="relative py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <Card className="bg-card text-card-foreground rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden relative">
              <div className="p-8 md:p-12 relative z-10">
                <div className="grid md:grid-cols-2 gap-8 items-center relative mb-8">
                  <div className="space-y-4">
                    <p className="font-semibold text-primary relative z-10">5-Minute Tour</p>
                    <h2 className="text-4xl font-bold font-headline text-card-foreground relative z-10">
                      Unlock the thriving <span className="text-primary">Ecosystem</span>
                    </h2>
                    <p className="text-muted-foreground max-w-md relative z-10">
                      Take a virtual tour and experience how the Hustloop Platform connects founders, mentors, and investors to build the future.
                    </p>
                  </div>
                </div>

                <div className="relative md:mt-28 mt-16 md:mb-12 mb-0">
                  <ContainerScroll
                    titleComponent={<></>}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src="https://placehold.co/1280x720.png"
                        alt="Hustloop platform screenshot"
                        width={1280}
                        height={720}
                        className="w-full h-full object-cover rounded-lg"
                        data-ai-hint="platform dashboard ui"
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center group">
                        <Button
                          variant="ghost"
                          className="w-24 h-24 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/30 transition-all duration-300 group-hover:scale-110"
                          aria-label="Play video tour"
                        >
                          <PlayCircle className="w-16 h-16 text-white" />
                        </Button>
                      </div>
                    </div>
                  </ContainerScroll>
                </div>
              </div>
            </Card>
          </div>
        </section>


        {/* Call to Action Section */}
        <section id="contact-section" className="relative py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
              <Card className="p-8 lg:p-12 h-full flex flex-col justify-center">
                <CardHeader className="p-0">
                  <CardTitle className="text-4xl font-bold font-headline">
                    Ready to build the{" "}
                    <span className="relative inline-block z-10 pt-2 md:pt-0">
                      Future
                      <svg
                        className="absolute w-[114px] md:w-[114px] -right-[2px] -bottom-[12px] md:-bottom-[10px] z-0"
                        aria-hidden="true"
                        role="presentation"
                        viewBox="0 0 114 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ pointerEvents: "none" }}
                      >
                        <path
                          d="M61.1407 5.29573C61.5825 5.29573 61.9407 4.93755 61.9407 4.49573C61.9407 4.0539 61.5825 3.69573 61.1407 3.69573V5.29573ZM25.6313 1.18441L25.5712 0.386673L25.6313 1.18441ZM65.1859 56.529L65.2466 57.3267L65.1859 56.529ZM102.238 49.5437L102.146 50.3384L102.238 49.5437ZM113 59L112.33 59.4366C112.546 59.7688 112.973 59.8924 113.333 59.7273C113.694 59.5621 113.879 59.1579 113.768 58.7772L113 59ZM113.483 45.9598C113.667 45.5584 113.492 45.0833 113.09 44.8986C112.689 44.7139 112.214 44.8896 112.029 45.291L113.483 45.9598ZM9.10831 45.245L8.60696 45.8685L8.60698 45.8685L9.10831 45.245ZM61.1407 3.69573C55.3296 3.69573 50.2958 2.60385 44.7326 1.62791C39.1822 0.654208 33.1789 -0.18624 25.5712 0.386673L25.6913 1.98216C33.1047 1.42388 38.9568 2.23909 44.4562 3.20384C49.9428 4.16636 55.1532 5.29573 61.1407 5.29573V5.29573ZM102.146 50.3384C103.978 50.5502 105.816 51.7049 107.587 53.4268C109.346 55.1369 110.954 57.3236 112.33 59.4366L113.67 58.5634C112.268 56.4103 110.585 54.1104 108.703 52.2797C106.832 50.4607 104.678 49.0204 102.329 48.749L102.146 50.3384ZM113.768 58.7772C113.392 57.4794 112.891 55.17 112.707 52.7136C112.521 50.2318 112.669 47.729 113.483 45.9598L112.029 45.291C111.04 47.4401 111.092 50.2798 111.112 52.8333C111.305 55.4122 111.828 57.8311 112.232 59.2228L113.768 58.7772ZM25.5712 0.386673C12.1968 1.39385 4.12231 9.70072 1.32012 19.2877C-1.46723 28.8239 0.948311 39.7092 8.60696 45.8685L9.60967 44.6216C2.5531 38.9466 0.211996 28.7819 2.85587 19.7366C5.4849 10.742 13.0295 2.93568 25.6913 1.98216L25.5712 0.386673ZM8.60698 45.8685C17.052 52.6596 27.4766 55.8004 37.6285 57.1087C47.7823 58.4172 57.7242 57.8998 65.2466 57.3267L65.1251 55.7313C57.6265 56.3026 47.8183 56.8086 37.833 55.5218C27.8456 54.2347 17.7419 51.1613 9.60965 44.6216L8.60698 45.8685ZM65.2466 57.3267C71.9263 56.8179 78.8981 54.7692 85.2941 53.0195C91.7606 51.2505 97.5723 49.8099 102.146 50.3384L102.329 48.749C97.3895 48.1782 91.2605 49.7286 84.8719 51.4762C78.4129 53.2432 71.6155 55.2369 65.1251 55.7313L65.2466 57.3267Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    ?
                  </CardTitle>

                </CardHeader>
                <CardContent className="p-0 mt-4 space-y-6">
                  <p className="text-muted-foreground">
                    {"Join Hustloop today and let turn your vision into reality. Your journey to success starts here."}
                  </p>
                  <div>
                    <p className="text-sm font-semibold">Email us</p>
                    <a href="mailto:support@hustloop.com" className="text-primary hover:underline">support[@]hustloop.com</a>
                  </div>
                  <div className="flex items-center gap-4">
                    <a href="https://x.com/hustloop" target="_blank" aria-label="X" className="text-muted-foreground hover:text-black [.theme-dark_&]:hover:text-white [.theme-purple_&]:hover:text-white [.theme-orange_&]:hover:text-white [.theme-blue-gray_&]:hover:text-white transition-colors">
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px] fill-current">
                        <title>X</title>
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.931L18.901 1.153Zm-1.653 19.57h2.608L6.856 2.597H4.062l13.185 18.126Z" />
                      </svg>
                    </a>
                    <a
                      href="https://www.linkedin.com/company/hustloop/"
                      aria-label="LinkedIn"
                      className="text-muted-foreground hover:text-[#0A66C2] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="h-6 w-6" />
                    </a>
                    <a
                      href="mailto:support@hustloop.com"
                      aria-label="Email"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-6 w-6" />
                    </a>
                    <a
                      href="https://www.instagram.com/hustloop_official"
                      aria-label="Instagram"
                      className="text-muted-foreground hover:text-[#E1306C] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="h-6 w-6" />
                    </a>
                    <a
                      href="https://www.youtube.com/@hustloop_talks"
                      aria-label="YouTube"
                      className="text-muted-foreground hover:text-[#FF0000] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                    </a>
                  </div>
                </CardContent>
              </Card>
              <Card className="p-8 lg:p-12">
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                    <FormField
                      control={contactForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} className="pr-16" required />
                            </FormControl>
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${field.value?.length >= 300 ? "text-red-500" : "text-muted-foreground"}`}>
                              {field.value?.length || 0}/300
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email address" {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="Enter your phone number"
                                maxLength={10}
                                {...field}
                                className="pr-16"
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  field.onChange(value);
                                }}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${(field.value?.length ?? 0) > 0 && (field.value?.length ?? 0) < 10
                              ? "text-amber-500"
                              : "text-muted-foreground"
                              }`}>
                              {(field.value?.length ?? 0)}/10
                            </span>
                          </div>
                          {(field.value?.length ?? 0) > 0 && (field.value?.length ?? 0) < 10 && (
                            <p className="text-xs text-amber-500 mt-1">Phone number must be 10 digits.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} required>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="mentorship">Mentorship Programs</SelectItem>
                              <SelectItem value="incubation">Incubation Support</SelectItem>
                              <SelectItem value="organizations">Organizations Partnerships</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="tech-transfer">Technology Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message <span className="text-red-500">*</span></FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Textarea
                                placeholder="How can we help you?"
                                {...field}
                                className="pb-6"
                                required
                              />
                            </FormControl>
                            <span className={`absolute right-3 bottom-2 text-xs ${field.value?.length >= 500 ? "text-red-500" : "text-muted-foreground"}`}>
                              {field.value?.length || 0}/500
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isContactSubmitting}>
                      {isContactSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {isContactSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </section>
        <Footer />
      </div >

    </>
  );
}