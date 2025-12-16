import { fetchSchedule } from "@/lib/data";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export default async function Home() {
  const schedule = await fetchSchedule();

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

      <ScheduleBoard schedule={schedule} />
    </main>
  );
}
