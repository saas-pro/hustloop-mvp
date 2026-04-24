import { ComponentType, SVGProps, useRef } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import styles from "./Solutionstyle.module.css"
import { motion, useTransform, useScroll } from "motion/react";


export type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Solution = {
  title: string;
  steps: Step[];
};

type SolutionCardsProps = {
  solutionSteps: Record<string, Solution>;
  scrollContainer?: React.RefObject<HTMLDivElement>;
};

const SolutionCard = ({ solutionSteps, scrollContainer }: SolutionCardsProps) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainer,
    offset: ['start start', 'end end'] // Track the entire duration of the scroll
  });



  // Pre-calculate all card scales - create individual transforms for each card
  const totalCards = Object.entries(solutionSteps).length;
  const cardScales: any[] = [];

  for (let i = 0; i < totalCards; i++) {
    const targetScale = 1 - (totalCards - i - 1) * 0.05;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cardScales.push(useTransform(
      scrollYProgress,
      [i / totalCards, (i + 1) / totalCards],
      [1, targetScale]
    ));
  }

  return (
    <section className="relative py-16 md:py-20 bg-background" ref={containerRef}>
      <h3
        className="text-4xl font-bold text-current sticky top-8 text-center"
      >
        Choose your{' '}
        <span className="relative inline-block">
          path
          <svg
            className="absolute left-0 bottom-0 w-[38px] sm:w-[50px] text-current"
            aria-hidden="true"
            role="presentation"
            viewBox="0 0 50 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ pointerEvents: 'none' }}
          >
            <path
              d="M1 2.94452C14.5 0.48118 31 0.481247 49 2.25307M10.6944 6C19.3488 4.11245 30 4.16042 38.4059 5.21069"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>{' '}
        to success
      </h3>
      <div className="mx-auto my-10 max-w-7xl">


        {/* Wrapper for scrollable cards */}
        <div className="flex flex-col">
          {Object.entries(solutionSteps).map(([key, solution], index) => {
            const isLastCard = index === Object.entries(solutionSteps).length - 1;

            if (isLastCard) {
              // 🔥 Special Flip Card for last solution
              return (
                <motion.div
                  key={key}
                  className={`${styles.cardContainer}`}
                  style={{ scale: cardScales[index], willChange: "transform" }}
                >
                  <Card
                    className={`${styles.card} bg-background flex-grow-0`}
                    style={{ top: `calc(5vh + ${index * 24}px)` }}
                  >
                    <div className="p-6 sm:p-8 lg:p-12">
                      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                        {/* Left Side: Title */}
                        <div className="lg:col-span-4 flex flex-col justify-center">
                          <h4 className="text-xl sm:text-2xl font-bold text-current capitalize">
                            {solution.title}
                          </h4>
                        </div>

                        {/* Right Side: Flipping Step Cards */}
                        <div className="lg:col-span-8 ">
                          <div className="grid gap-6 grid-cols-1 sm:grid-cols-3 ">
                            {solution.steps.map((step, index) => (
                              <div
                                key={step.title}
                                className="relative group h-[120px] md:h-[400px] [perspective:1000px] "
                                style={{
                                  transform: `rotateZ(${index % 2 === 0 ? '4deg' : '-4deg'})`,
                                }}
                              >
                                {/* This is the div that will handle the flip */}
                                <div className="relative w-full h-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

                                  {/* Front Side */}
                                  <Card className="absolute inset-0 flex flex-col items-center justify-center shadow-md [backface-visibility:hidden]">
                                    <div className="flex items-center w-16 h-16 justify-center size-16 rounded-full border-2 border-primary bg-background shadow mb-4">
                                      <step.icon className="size-8 text-primary" />
                                    </div>
                                    <h4 className="font-semibold text-foreground text-lg">{step.title}</h4>
                                  </Card>

                                  {/* Back Side */}
                                  <Card className="absolute inset-0 flex items-center justify-center p-6 shadow-md [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                    <p className="text-sm text-muted-foreground text-center">
                                      {step.description}
                                    </p>
                                  </Card>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                </motion.div>

              );
            }
            return (
              <motion.div
                key={key}
                className={`${styles.cardContainer}`}
                style={{ scale: cardScales[index], willChange: "transform" }}
              >
                <Card className={`${styles.card} bg-background`} style={{
                  top: `calc(5vh + ${index * 24}px)`
                }}
                >
                  <div className="p-6 sm:p-8 lg:p-12">
                    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                      {/* Left side: title */}
                      <div className="lg:col-span-4 flex flex-col justify-center">
                        <h4 className="text-xl sm:text-2xl font-bold text-current mb-4 capitalize">
                          {solution.title}
                        </h4>
                      </div>

                      {/* Right side: steps */}
                      <div className="lg:col-span-8">
                        <div className="flex flex-col items-center justify-center min-h-[300px] lg:min-h-[400px]">
                          {/* Mobile view: vertical */}
                          <div className="block lg:hidden w-full space-y-6">
                            {solution.steps.map((step, index) => {
                              const isLast = index === solution.steps.length - 1;
                              return (
                                <div key={step.title} className="flex relative">
                                  <div className="relative flex flex-col items-center mr-4">
                                    <div
                                      className={cn(
                                        "flex size-16 items-center justify-center rounded-full border-2 bg-background shadow-lg shrink-0 z-10",
                                        isLast ? "border-flow-accent" : "border-primary"
                                      )}
                                    >
                                      <step.icon
                                        className={cn(
                                          "size-8",
                                          isLast ? "text-flow-accent" : "text-primary"
                                        )}
                                      />
                                    </div>
                                    {!isLast && (
                                      <div
                                        className="absolute top-16 left-1/2 -translate-x-1/2 w-0.5 bg-border"
                                        style={{ height: "calc(100% + 1.5rem)" }}
                                      />
                                    )}
                                  </div>

                                  <div className="flex-1 pt-2">
                                    <h4 className="font-semibold text-foreground text-lg">
                                      {step.title}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Desktop view: horizontal */}
                          <div className="hidden lg:block w-full relative">
                            <div className="absolute top-8 inset-x-16 h-0.5 bg-border" />
                            <div className="relative flex justify-between items-start">
                              {solution.steps.slice(0, -1).map((_, index) => {
                                const position =
                                  ((index + 1) / solution.steps.length) * 100;
                                return (
                                  <div
                                    key={`line-${index}`}
                                    className="absolute top-8 h-8 w-0.5 bg-border"
                                    style={{
                                      left: `${position}%`,
                                      transform: "translateX(-50%)",
                                    }}
                                  />
                                );
                              })}

                              {solution.steps.map((step, index) => {
                                const isLast = index === solution.steps.length - 1;
                                return (
                                  <div
                                    key={step.title}
                                    className="relative flex flex-col items-center text-center"
                                    style={{ width: `${100 / solution.steps.length}%` }}
                                  >
                                    <div
                                      className={cn(
                                        "relative flex size-16 items-center justify-center rounded-full border-2 bg-background shadow-lg mb-4",
                                        isLast ? "border-yellow-400" : "border-primary"
                                      )}
                                    >
                                      <step.icon
                                        className={cn(
                                          "size-8",
                                          isLast ? "text-yellow-400" : "text-primary"
                                        )}
                                      />
                                    </div>
                                    <h4 className="font-semibold text-foreground text-sm lg:text-base px-2">
                                      {step.title}
                                    </h4>
                                    <p className="text-xs lg:text-sm text-muted-foreground mt-1 px-2">
                                      {step.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default SolutionCard;