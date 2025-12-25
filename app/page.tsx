import { getWeeklySchedule } from "@/lib/services/reservation";
import { ScheduleBoard } from "@/components/ScheduleBoard";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  // 1. Determine Target Date (Default: Today)
  const targetDateStr = searchParams.date || new Date().toISOString().split('T')[0];

  // 2. Calculate Monday of that week
  const targetDate = new Date(targetDateStr);
  const day = targetDate.getDay();
  const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(targetDate);
  monday.setDate(diff);
  const mondayStr = monday.toISOString().split('T')[0];

  // 3. Fetch Data for that week
  const schedule = await getWeeklySchedule(mondayStr);

  // 4. Calculate Prev/Next Week Links
  const prevWeek = new Date(monday);
  prevWeek.setDate(monday.getDate() - 7);
  const prevDateStr = prevWeek.toISOString().split('T')[0];

  const nextWeek = new Date(monday);
  nextWeek.setDate(monday.getDate() + 7);
  const nextDateStr = nextWeek.toISOString().split('T')[0];

  // Format display date (e.g., 2025-12-22)
  const displayDate = mondayStr;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-7xl px-4 mb-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">
          <span className="text-pink-600">SPO</span>ROUND
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          스포라운드 체육관 대관 및 예약 시스템
        </p>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4 bg-white inline-flex px-4 py-2 rounded-lg shadow-sm">
          <Link href={`/?date=${prevDateStr}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="text-lg font-bold text-gray-800 min-w-[120px]">
            {displayDate} 주간
          </span>
          <Link href={`/?date=${nextDateStr}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>

      <ScheduleBoard schedule={schedule} startDate={mondayStr} />
    </main>
  );
}
