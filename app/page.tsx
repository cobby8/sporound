import { getWeeklySchedule } from "@/lib/services/reservation";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export default async function Home() {
  // TODO: Dynamic start date based on current week or URL param
  const today = new Date().toISOString().split('T')[0];

  // Calculate this week's Monday
  const d = new Date(today);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  const mondayStr = monday.toISOString().split('T')[0];

  const schedule = await getWeeklySchedule(mondayStr);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-7xl px-4 mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          <span className="text-pink-600">SPO</span>ROUND
        </h1>
        <p className="text-lg text-gray-600">
          스포라운드 체육관 대관 및 예약 시스템
        </p>
      </div>

      <ScheduleBoard schedule={schedule} startDate={mondayStr} />
    </main>
  );
}
