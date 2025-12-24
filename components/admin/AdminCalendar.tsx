"use client";

import { useState, Fragment, useEffect } from "react"; // Removed unnecessary imports
import { TimeSlot, CellData, generateScheduleData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ReservationEditModal } from "@/components/admin/ReservationEditModal"; // Correct Import Location

// Reuse types or import if shared (Duplicated for speed, refactor later)
const DAYS = [
    { key: "mon", label: "월요일" },
    { key: "tue", label: "화요일" },
    { key: "wed", label: "수요일" },
    { key: "thu", label: "목요일" },
    { key: "fri", label: "금요일" },
    { key: "sat", label: "토요일" },
    { key: "sun", label: "일요일" },
];

export function AdminCalendar() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState<TimeSlot[]>([]);

    // Detail Modal State
    const [selectedReservation, setSelectedReservation] = useState<any>(null);

    // Date Logic (Default: Current Week Monday)
    const [currentDate, setCurrentDate] = useState(new Date());

    const getMonday = (d: Date) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    const [startDate, setStartDate] = useState(getMonday(new Date()));

    const formatDateShort = (date: Date) => {
        return `${date.getMonth() + 1}.${date.getDate()}`;
    };

    const formatDateFull = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getDayDate = (dayIndex: number) => {
        const start = new Date(startDate);
        const target = new Date(start);
        target.setDate(start.getDate() + dayIndex);
        return target;
    };

    const [courts, setCourts] = useState<any[]>([]);

    // Fetch Data
    const fetchSchedule = async () => {
        setLoading(true);
        // Fetch courts first if empty
        if (courts.length === 0) {
            const { data: courtsData } = await supabase.from('courts').select('id, name');
            if (courtsData) setCourts(courtsData);
        }

        const startStr = formatDateFull(startDate);
        const endDay = new Date(startDate);
        endDay.setDate(endDay.getDate() + 6);
        const endStr = formatDateFull(endDay);

        const { data: reservations, error } = await supabase
            .from('reservations')
            .select(`
                *,
                profiles (name, email, phone),
                courts (name)
            `)
            .gte('date', startStr)
            .lte('date', endStr)
            .not('status', 'eq', 'rejected'); // Show pending/confirmed

        if (error) {
            console.error(error);
            return;
        }

        const newSchedule = generateScheduleData(reservations || []);
        setSchedule(newSchedule);
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedule();

        // Realtime
        const channel = supabase
            .channel('admin-calendar-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations' },
                () => fetchSchedule()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [startDate]);

    const handlePrevWeek = () => {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() - 7);
        setStartDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + 7);
        setStartDate(newDate);
    };

    const handleToday = () => {
        setStartDate(getMonday(new Date()));
    };

    // Fetch Full Details on Click
    const handleCellClick = async (reservationId: string) => {
        console.log("Fetching details for:", reservationId);
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                *,
                profiles:user_id (name, email, phone),
                courts (name)
            `)
            .eq('id', reservationId)
            .single();

        if (error) {
            console.error("Error fetching reservation:", error);
            return;
        }

        if (data) {
            console.log("Fetched Reservation Data:", data); // Debug Log
            setSelectedReservation(data);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-pink-600" /></div>;
    }

    return (
        <>
            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            {startDate.getFullYear()}년 {startDate.getMonth() + 1}월
                        </h2>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button onClick={handlePrevWeek} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={handleToday} className="px-3 text-sm font-medium hover:bg-white rounded shadow-sm transition">오늘</button>
                            <button onClick={handleNextWeek} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-[60px_repeat(14,minmax(0,1fr))] border-t border-l border-gray-200 overflow-x-auto">
                    <div className="bg-gray-50 border-r border-b p-2 text-center text-xs font-bold flex items-center justify-center sticky left-0 z-30">시간</div>

                    {DAYS.map((day, idx) => (
                        <div key={day.key} className="col-span-2 bg-gray-50 border-r border-b p-2 text-center">
                            <div className="font-bold text-sm">{day.label}</div>
                            <div className="text-xs text-gray-500">{formatDateShort(getDayDate(idx))}</div>
                        </div>
                    ))}

                    <div className="bg-gray-50 border-r border-b p-1 text-center text-xs font-semibold sticky left-0 z-30">코트</div>
                    {DAYS.map((day) => (
                        <Fragment key={`court-${day.key}`}>
                            <div className="bg-pink-50 text-pink-700 border-r border-b p-1 text-center text-xs font-bold">P</div>
                            <div className="bg-emerald-50 text-emerald-700 border-r border-b p-1 text-center text-xs font-bold">M</div>
                        </Fragment>
                    ))}

                    {schedule.map((slot, rIdx) => (
                        <div key={rIdx} className="contents">
                            <div className="bg-white border-r border-b p-2 text-center text-xs font-medium sticky left-0 z-20 h-[50px] flex items-center justify-center">
                                {slot.time}
                            </div>

                            {DAYS.map((day, dIdx) => {
                                const renderCell = (courtData: CellData, type: 'pink' | 'mint') => {
                                    if (courtData.rowSpan === 0) return null;

                                    const isOccupied = !!courtData.text;

                                    let bgStyle = {};
                                    if (courtData.color) {
                                        bgStyle = { backgroundColor: courtData.color, color: 'white' };
                                    }

                                    const bgColorClass = !courtData.color
                                        ? (type === 'pink'
                                            ? (isOccupied ? 'bg-pink-100 hover:bg-pink-200 text-pink-900' : 'bg-white hover:bg-gray-50')
                                            : (isOccupied ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900' : 'bg-white hover:bg-gray-50'))
                                        : '';

                                    return (
                                        <div
                                            key={`${day.key}-${type}-${rIdx}`}
                                            style={{
                                                gridRow: `span ${courtData.rowSpan}`,
                                                ...bgStyle
                                            }}
                                            className={cn(
                                                "border-r border-b p-1 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative group",
                                                bgColorClass,
                                                courtData.rowSpan === 1 && "h-[50px]"
                                            )}
                                            onClick={(e) => {
                                                if (isOccupied && courtData.reservationId) {
                                                    handleCellClick(courtData.reservationId);
                                                }
                                            }}
                                        >
                                            {isOccupied && (
                                                <span className="text-[10px] font-bold leading-tight line-clamp-2">
                                                    {courtData.text}
                                                </span>
                                            )}
                                        </div>
                                    )
                                };

                                return (
                                    <Fragment key={`group-${day.key}-${rIdx}`}>
                                        {renderCell(slot.courts[day.key].pink, 'pink')}
                                        {renderCell(slot.courts[day.key].mint, 'mint')}
                                    </Fragment>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Shared Edit Modal */}
            <ReservationEditModal
                reservation={selectedReservation}
                isOpen={!!selectedReservation}
                onClose={() => setSelectedReservation(null)}
                onSuccess={() => {
                    fetchSchedule();
                    setSelectedReservation(null);
                }}
            />
        </>
    );
}
