import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ContributionDay {
    date: string;
    count: number;
}

interface ContributionGraphProps {
    data: ContributionDay[];
    year?: number;
}

export function ContributionGraph({ data, year }: ContributionGraphProps) {
    // Get the year to display (current year if not specified)
    const displayYear = year || new Date().getFullYear();

    // Create a map of dates to counts for quick lookup
    const dataMap = new Map(data.map(d => [d.date, d.count]));

    // Get the first and last day of the year
    const startDate = new Date(displayYear, 0, 1);
    const endDate = new Date(displayYear, 11, 31);

    // Calculate the starting Sunday (to align weeks properly)
    const startDay = startDate.getDay();
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDay);

    // Generate all weeks for the year
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    let currentDate = new Date(firstSunday);

    while (currentDate <= endDate || currentWeek.length > 0) {
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }

        currentWeek.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);

        // Stop if we've gone past the end of the year and completed the week
        if (currentDate > endDate && currentWeek.length === 7) {
            weeks.push(currentWeek);
            break;
        }
    }

    // If there's a partial week at the end, push it
    if (currentWeek.length > 0 && currentWeek.length < 7) {
        // Pad the week to 7 days
        while (currentWeek.length < 7) {
            currentWeek.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(currentWeek);
    }

    // Get color based on contribution count
    const getColor = (count: number) => {
        if (count === 0) return 'bg-muted';
        if (count === 1) return 'bg-accent/80';
        return 'bg-accent/80';
    };

    // Month labels
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabels: { month: string; x: number }[] = [];

    weeks.forEach((week, weekIndex) => {
        const firstDayOfWeek = week[0];
        if (firstDayOfWeek.getDate() <= 7 && firstDayOfWeek.getFullYear() === displayYear) {
            monthLabels.push({
                month: months[firstDayOfWeek.getMonth()],
                x: weekIndex
            });
        }
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="w-full overflow-x-auto md:overflow-hidden px-2 md:px-[20%]">
            <div className="inline-block w-full">
                <div className="flex gap-1 justify-start md:justify-center">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[19px] md:gap-[19px] pr-2 md:pr-3 text-[10px] md:text-xs text-muted-foreground" style={{ paddingTop: '20px' }}>
                        {dayLabels.map((day, i) => (
                            <div key={day} className="h-[10px] md:h-[14px] flex items-center">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Contribution grid */}
                    <div className="flex-1">
                        {/* Month labels */}
                        <div className="flex gap-[3px] md:gap-[5px] mb-2 text-[10px] md:text-xs text-muted-foreground relative" style={{ height: '18px' }}>
                            {monthLabels.map(({ month, x }) => (
                                <div
                                    key={`${month}-${x}`}
                                    className="absolute"
                                    style={{ left: `${x * 10}px` }}
                                >
                                    {month}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex gap-[3px] md:gap-[5px]">
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-[13px] md:gap-[18px]">
                                    {week.map((date, dayIndex) => {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const dateStr = `${year}-${month}-${day}`;

                                        const count = dataMap.get(dateStr) || 0;
                                        const isInYear = date.getFullYear() === displayYear;

                                        return (
                                            <TooltipProvider key={dayIndex} delayDuration={0}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={`w-[10px] h-[10px] md:w-[14px] md:h-[14px] rounded-sm ${isInYear ? getColor(count) : 'bg-transparent'
                                                                } ${count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}`}
                                                        />
                                                    </TooltipTrigger>
                                                    {isInYear && (
                                                        <TooltipContent>
                                                            <p className="text-xs">
                                                                <span className="font-semibold">{count}</span> sub{count !== 1 ? 's' : ''} on{' '}
                                                                {date.toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
