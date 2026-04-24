import React from "react";
import { Timeline, TimelineItem } from "./timeline";

type EventItem = {
  id: string;
  date: string | null;
  title: string;
  isCurrent?: boolean;
  color?: string;
};

export default function VerticalTimeline({
  timeline,
}: {
  timeline: {
    application_started: string;
    application_ended: string;
    review_started: string;
    review_ended: string;
    screening_started: string;
    screening_ended: string;
    extended_end_date?: string | null;
    pitching_started?: string | null;
    pitching_ended?: string | null;
    challengeClose?: boolean | string;
  };
}) {

  const isClosed =
    timeline.challengeClose === true ||
    timeline.challengeClose === "true";

  const events: EventItem[] = [
    {
      id: "challenge_started",
      date: timeline.application_started,
      title: "Challenge Started",
    },
    !timeline.extended_end_date ? {
      id: "challenge_ended",
      date: timeline.application_ended,
      title: "Challenge Ended",
    } : null,

    timeline.extended_end_date
      ? {
        id: "extended_end_date",
        date: timeline.extended_end_date,
        title: "Extended End Date",
      }
      : null,

    {
      id: "review_started",
      date: timeline.review_started,
      title: "Review Started",
    },
    {
      id: "review_ended",
      date: timeline.review_ended,
      title: "Review Ended",
    },
    {
      id: "screening_started",
      date: timeline.screening_started,
      title: "Screening Started",
    },
    {
      id: "screening_ended",
      date: timeline.screening_ended,
      title: "Screening Ended",
    },
    {
      id: "pitching_started",
      date: timeline.pitching_started,
      title: "Pitching Started",
    },
    {
      id: "pitching_ended",
      date: timeline.pitching_ended,
      title: "Pitching Ended",
    }
  ].filter(ev => ev && ev.date) as EventItem[];


  const safeDate = (value: string | null) =>
    value ? new Date(value) : null;

  const now = new Date();
  let currentIndex = -1;
  if (!isClosed) {
    for (let i = 0; i < events.length; i++) {
      const currentDate = safeDate(events[i].date);
      const nextDate = safeDate(events[i + 1]?.date ?? null);
      if (!currentDate) {
        currentIndex = i;
        break;
      }

      if (!nextDate) {
        if (now >= currentDate) currentIndex = i;
        break;
      }

      if (now >= currentDate && now < nextDate) {
        currentIndex = i;
        break;
      }
    }
  }
  const isToday = (d: Date | null) => {
    if (!d) return false;
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    );
  };
  const finalEvents = events.map((ev, idx) => {
    const d = safeDate(ev.date);
    let color = "text-gray-400";

    if (d) {
      if (isToday(d)) {
        color = "text-primary font-semibold";
      } else if (isClosed) {
        color = d < now ? "text-red-500" : "text-gray-400";
      } else {
        if (d < now) color = "text-red-500";
        if (idx === currentIndex) color = "text-primary font-semibold";
        if (d > now) color = "text-gray-400";
      }
    }

    return {
      ...ev,
      isCurrent: idx === currentIndex || isToday(d),
      color,
    };
  });


  return (
    <Timeline className="w-[70vw] md:w-2/3">
      {finalEvents.map((ev, i) => (
        <TimelineItem
          key={ev.id}
          date={ev.date}
          title={ev.title}
          isCurrent={ev.isCurrent}
          color={ev.color}
          isLast={i === finalEvents.length - 1}
          challengeClose={isClosed}
        />
      ))}
    </Timeline>
  );
}
