"use client";

import { useState, Fragment, useEffect } from "react";
import { TimeSlot, CellData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservationModal } from "@/components/ReservationModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ScheduleBoardProps {
    schedule: TimeSlot[];
    startDate: string; // YYYY-MM-DD of the Monday of this week
}

const DAYS = [
    { key: "mon", label: "월요일" },
    { key: "tue", label: "화요일" },
    { key: "wed", label: "수요일" },
    { key: "thu", label: "목요일" },
    { key: "fri", label: "금요일" },
    { key: "sat", label: "토요일" },
    { key: "sun", label: "일요일" },
];

export function ScheduleBoard({ schedule, startDate }: ScheduleBoardProps) {
    const router = useRouter();
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        time: string;
        day: string;
        date: string; // YYYY-MM-DD
        court: "pink" | "mint";
    }>({
        isOpen: false,
        time: "",
        day: "",
        date: "",
        court: "pink",
    });

    // Calculate dates for headers
    const getDayDate = (dayIndex: number) => {
        const start = new Date(startDate);
        const target = new Date(start);
        target.setDate(start.getDate() + dayIndex);
        return target;
    };

    const formatDateShort = (date: Date) => {
        return `${date.getMonth() + 1}.${date.getDate()}`;
    };

    const formatDateFull = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('schedule-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations',
                },
                (payload) => {
                    console.log('Realtime update received:', payload);
                    router.refresh(); // Server component refresh
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    const currentDay = DAYS[selectedDayIndex];
    const currentDate = getDayDate(selectedDayIndex);

    const handleCellClick = (time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean) => {
        if (isOccupied) return;

        const targetDate = getDayDate(dayIndex);

        setModalState({
            isOpen: true,
            time,
            day: DAYS[dayIndex].label, // "월요일"
            date: formatDateFull(targetDate), // "2024-XX-XX"
            court,
        });
    };

    return (
        <>
            <div className="w-full max-w-[1400px] mx-auto p-2 md:p-4">
                {/* Header Title */}
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    체육관 대관 현황 <span className="text-base font-normal text-gray-500 ml-2">({startDate} 주간)</span>
                </h2>

                {/* Mobile Day Selector */}
                <div className="flex md:hidden items-center justify-between mb-4 bg-gray-100 rounded-lg p-2">
                    <button
                        onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                        disabled={selectedDayIndex === 0}
                        className="p-2 disabled:opacity-30"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-lg">
                        {currentDay.label} <span className="text-sm text-gray-500 font-normal">({formatDateShort(currentDate)})</span>
                    </span>
                    <button
                        onClick={() => setSelectedDayIndex((prev) => Math.min(DAYS.length - 1, prev + 1))}
                        disabled={selectedDayIndex === DAYS.length - 1}
                        className="p-2 disabled:opacity-30"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Unified Grid */}
                <div className={cn(
                    "grid",
                    // Mobile: Time + Pink + Mint (3 cols)
                    "grid-cols-[50px_1fr_1fr]",
                    // Desktop: Time + 14 columns (7 days * 2 courts)
                    "md:grid-cols-[60px_repeat(14,minmax(0,1fr))]",
                    "border-t border-l border-gray-200"
                )}>
                    {/* --- HEADERS --- */}

                    {/* Time Header (Corner) */}
                    <div className="bg-gray-50 p-2 text-center font-bold text-xs md:text-sm border-r border-b border-gray-200 flex items-center justify-center sticky top-0 z-20 h-[60px]">
                        시간
                    </div>

                    {/* Day Headers */}
                    {DAYS.map((day, dIdx) => (
                        <div
                            key={`header-${day.key}`}
                            className={cn(
                                "bg-gray-50 text-center font-bold text-sm border-r border-b border-gray-200 flex flex-col items-center justify-center sticky top-0 z-20 h-[60px]",
                                // Span 2 columns (Pink + Mint)
                                "col-span-2",
                                // Visibility logic
                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                            )}
                        >
                            <span>{day.label}</span>
                            <span className="text-xs text-gray-500 font-normal mt-1">
                                {formatDateShort(getDayDate(dIdx))}
                            </span>
                        </div>
                    ))}

                    {/* Court Sub-Headers (Pink/Mint) */}
                    {/* Time Spacer Row for Courts (Just another cell in col 1) */}
                    <div className="bg-gray-50 border-r border-b border-gray-200 text-xs text-center flex items-center justify-center font-semibold sticky top-[60px] z-20 h-[30px]">
                        코트
                    </div>

                    {DAYS.map((day, dIdx) => (
                        <Fragment key={`court-header-group-${day.key}`}>
                            {/* Pink Header */}
                            <div className={cn(
                                "bg-gray-100 text-pink-600 font-bold text-xs border-r border-b border-gray-200 flex items-center justify-center sticky top-[60px] z-20 h-[30px]",
                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                            )}>
                                핑크
                            </div>
                            {/* Mint Header */}
                            <div className={cn(
                                "bg-gray-100 text-emerald-600 font-bold text-xs border-r border-b border-gray-200 flex items-center justify-center sticky top-[60px] z-20 h-[30px]",
                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                            )}>
                                민트
                            </div>
                        </Fragment>
                    ))}

                    {/* --- BODY --- */}
                    {schedule.map((slot, rowIndex) => (
                        // We use React.Fragment to flatten the loop into the grid
                        <div key={`row-${rowIndex}`} className="contents">
                            {/* Time Slot */}
                            <div className="bg-gray-50 text-gray-500 text-xs md:text-sm font-medium border-r border-b border-gray-100 flex items-center justify-center py-2 h-[50px]">
                                {slot.time}
                            </div>

                            {/* Court Cells */}
                            {DAYS.map((day, dIdx) => {
                                const courtDataPink = slot.courts[day.key].pink;
                                const courtDataMint = slot.courts[day.key].mint;

                                // Helper to render a cell
                                const renderCell = (courtData: CellData, courtType: "pink" | "mint") => {
                                    if (courtData.rowSpan === 0) return null; // Hidden (merged)

                                    const isOccupied = !!courtData.text;
                                    const bgColor = courtType === "pink"
                                        ? (isOccupied ? "bg-pink-100 hover:bg-pink-200" : "bg-white hover:bg-pink-50")
                                        : (isOccupied ? "bg-emerald-100 hover:bg-emerald-200" : "bg-white hover:bg-emerald-50");
                                    const textColor = courtType === "pink" ? "text-pink-900" : "text-emerald-900";

                                    return (
                                        <div
                                            key={`${day.key}-${courtType}-${slot.time}`} // Unique key
                                            style={{
                                                gridRow: `span ${courtData.rowSpan}`
                                            }}
                                            onClick={() => handleCellClick(slot.time, dIdx, courtType, isOccupied)}
                                            className={cn(
                                                "border-r border-b border-gray-100 flex items-center justify-center text-center p-1 cursor-pointer transition-colors relative z-10",
                                                bgColor,
                                                textColor,
                                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex",
                                                // Ensure height is correct for singles, spanned ones grow automatically
                                                courtData.rowSpan === 1 && "h-[50px]"
                                            )}
                                        >
                                            {isOccupied && (
                                                <span className="font-semibold text-xs leading-tight break-keep block w-full">
                                                    {courtData.text}
                                                </span>
                                            )}
                                        </div>
                                    );
                                };

                                return (
                                    <Fragment key={`cell-group-${day.key}`}>
                                        {renderCell(courtDataPink, "pink")}
                                        {renderCell(courtDataMint, "mint")}
                                    </Fragment>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <ReservationModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                selectedTime={modalState.time}
                selectedDay={modalState.day}
                selectedDate={modalState.date}
                selectedCourt={modalState.court}
            />
        </>
    );
}
