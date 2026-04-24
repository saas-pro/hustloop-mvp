'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lightbulb, Microscope, Puzzle } from 'lucide-react';
import type { View } from '@/app/types';
import CircularText from '@/components/CircularText';
import { Marquee } from '@/components/ui/marquee';

const MsmesView = dynamic(() => import('./msmes'));
const TechTransferView = dynamic(() => import('../browsetech/browsetech'));
const IncubatorsView = dynamic(() => import('./incubators'));

interface MarketplaceViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setActiveView: (view: View) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
}

export default function MarketplaceView({ isOpen, onOpenChange, setActiveView, isLoggedIn, hasSubscription }: MarketplaceViewProps) {
  const [internalView, setInternalView] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(isOpen);

  useEffect(() => {
    setIsDialogOpen(isOpen);
  }, [isOpen]);
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      onOpenChange(false);
    }
  };
  const handleInternalViewClose = (viewName: string) => (open: boolean) => {
    if (!open) {
      setInternalView(null);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center font-headline">Marketplace</DialogTitle>
            <DialogDescription className="text-center">
              Explore opportunities, solve challenges, and discover new technologies.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="challenges" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 h-fit md:grid-cols-3">
              <TabsTrigger value="challenges">Solve Challenges</TabsTrigger>
              <TabsTrigger value="tech">Technology Transfer</TabsTrigger>
              <TabsTrigger value="incubators">Incubators</TabsTrigger>
            </TabsList>

            <TabsContent value="challenges">
              <Card className='min-h-[30.5vh] flex flex-col md:flex-row justify-between'>
                <div className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Puzzle />
                      Solve Corporate & MSME Challenges
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between pb-0 md:pb-6">
                    <div className="flex-1 flex flex-row items-center gap-4">
                      <p className="text-muted-foreground mb-4 flex-1">
                        Apply your skills to solve real-world problems posted by companies and MSMEs. Get rewarded and gain valuable experience.
                      </p>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        localStorage.setItem("fromMarketplace", "true");
                        setInternalView("msmes");
                      }}
                      className='w-fit'
                    >
                      Browse Challenges <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                  <div className='md:hidden w-full flex flex-col items-center'>
                    <div className="w-fit overflow-hidden py-1 px-4">
                      <Marquee speed={18} className="w-[80vw]">
                        <span className="text-[30px] sm:text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                          INCENTIVE CHALLENGES •
                        </span>
                      </Marquee>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex justify-center items-center m-6">
                  <CircularText
                    text="INCENTIVE*CHALLENGES*"
                    spinDuration={10}
                    onHover="pause"
                    className='!h-36 !w-36'
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="tech">
              <Card className='min-h-[30.5vh] flex flex-col md:flex-row justify-between'>
                <div className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Microscope />
                      Technology Transfer
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between pb-0 md:pb-6">
                    <div className="flex-1 flex flex-row md:flex-row items-center gap-4">
                      <p className="text-muted-foreground mb-4 flex-1">
                        Discover and license cutting-edge technologies from universities and research institutions. Access innovative solutions and intellectual property ready for Monitize.
                      </p>
                    </div>

                    <Button onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInternalView("browseTech");
                    }}
                      className='w-fit'>
                      Browse Technologies <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                  <div className='md:hidden w-full flex flex-col items-center'>
                    <div className="w-fit overflow-hidden py-1 px-4">
                      <Marquee speed={18} className="w-[80vw]">
                        <span className="text-[30px] sm:text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                          TECHNOLOGY TRANSFER •
                        </span>
                      </Marquee>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex justify-center items-center m-6">
                  <CircularText
                    text="TECHNOLOGY*TRANSFER*"
                    spinDuration={10}
                    onHover="pause"
                    className='!h-36 !w-36'
                  />
                </div>
              </Card>

            </TabsContent>

            <TabsContent value="incubators">
              <Card className='min-h-[30.5vh] flex flex-col md:flex-row justify-between'>
                <div className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb />
                      Startup Incubation
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between pb-0 md:pb-6">
                    <div className="flex-1 flex flex-row justify-center items-center gap-4">
                      <p className="text-muted-foreground mb-4 flex-1">
                        Discover the ideal incubator that will provide the guidance, support, and resources needed to nurture your idea into a successful reality and accelerate your startup journey.
                      </p>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        localStorage.setItem("fromMarketplace", "true");
                        setInternalView("incubators");
                      }}
                      className='w-fit'>
                      Find an Incubator <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                  <div className='md:hidden w-full flex flex-col items-center'>
                    <div className="w-fit overflow-hidden py-1 px-4">
                      <Marquee speed={18} className="w-[80vw]">
                        <span className="text-[30px] sm:text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                          DREAM STARTUP •
                        </span>
                      </Marquee>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex justify-center items-center m-6">
                  <CircularText
                    text="STARTUP*DREAM*"
                    spinDuration={10}
                    onHover="pause"
                    className='!h-36 !w-36'
                  />
                </div>

              </Card>


            </TabsContent>

          </Tabs>
        </DialogContent>
      </Dialog >

      {internalView === "msmes" && (
        <MsmesView
          isOpen={internalView === "msmes"}
          onOpenChange={handleInternalViewClose("msmes")}
          setActiveView={setActiveView}
          isLoggedIn={isLoggedIn}
          hasSubscription={hasSubscription}
        />
      )}

      {
        internalView === 'browseTech' && (
          <TechTransferView
            isOpen={true}
            onOpenChange={handleInternalViewClose('browseTech')}
            setActiveView={setActiveView}
          />
        )
      }

      {
        internalView === 'incubators' && (
          <IncubatorsView
            isOpen={true}
            onOpenChange={handleInternalViewClose('incubators')}
            isLoggedIn={isLoggedIn}
            hasSubscription={hasSubscription}
            setActiveView={setActiveView}
          />
        )
      }
    </>
  );
}
