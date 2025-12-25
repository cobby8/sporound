"use client";

import { useState, Fragment, useEffect } from "react";
import { TimeSlot, CellData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { ReservationModal } from "@/components/ReservationModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ScheduleBoardProps {
    schedule: TimeSlot[];
    startDate: string; // YYYY-MM-DD of the Monday of this week
    onOccupiedCellClick?: (reservationId: string, e?: React.MouseEvent) => void;
    onReserve?: (data: { startTime: string, endTime: string, date: string, court: string }) => void;
    headerOffset?: number;
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

export function ScheduleBoard({ schedule, startDate, onOccupiedCellClick, onReserve, headerOffset = 64 }: ScheduleBoardProps) {
    const router = useRouter();
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [selectedSlots, setSelectedSlots] = useState<{
        time: string;
        dayIndex: number;
        court: "pink" | "mint";
        date: string;
    }[]>([]);

    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        startTime: string;
        endTime: string;
        day: string;
        date: string; // YYYY-MM-DD
        court: "pink" | "mint";
    }>({
        isOpen: false,
        startTime: "",
        endTime: "",
        day: "",
        date: "",
        court: "pink",
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{
        time: string;
        dayIndex: number;
        court: "pink" | "mint";
        date: string;
    } | null>(null);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

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



    const toMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const handleCellMouseDown = (time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean, reservationId?: string, e?: React.MouseEvent) => {
        if (isOccupied) return; // Occupied cells are handled by click (popover)

        // Prevent default text selection during drag
        if (e) e.preventDefault();

        const targetDate = formatDateFull(getDayDate(dayIndex));
        const startSlot = { time, dayIndex, court, date: targetDate };

        setIsDragging(true);
        setDragStart(startSlot);
        setSelectedSlots([startSlot]);
    };

    const handleCellMouseEnter = (time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean) => {
        if (!isDragging || !dragStart) return;
        if (isOccupied) return;

        // Restrict drag to same day and same court for simplicity (Google Calendar style)
        if (dragStart.dayIndex !== dayIndex || dragStart.court !== court) return;

        // Calculate range
        const startMins = toMinutes(dragStart.time);
        const currentMins = toMinutes(time);

        const minTime = Math.min(startMins, currentMins);
        const maxTime = Math.max(startMins, currentMins);

        // Find all slots in schedule that are in this range on this day/court
        // Filter those that are NOT occupied
        const newSelection: typeof selectedSlots = [];

        // Iterate through schedule to find matching slots
        // Optimization: schedule is ordered by time? Yes.
        schedule.forEach(slot => {
            const slotMins = toMinutes(slot.time);
            if (slotMins >= minTime && slotMins <= maxTime) {
                // Check occupation (though if we are dragging over it, maybe we should stop? 
                // For now, let's include valid empty slots in range)
                const courtData = court === 'pink' ? slot.courts[DAYS[dayIndex].key].pink : slot.courts[DAYS[dayIndex].key].mint;
                if (!courtData.text && !courtData.reservationId) {
                    newSelection.push({
                        time: slot.time,
                        dayIndex,
                        court,
                        date: dragStart.date
                    });
                }
            }
        });

        setSelectedSlots(newSelection);
    };

    const handleCellClick = (time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean, reservationId?: string, e?: React.MouseEvent) => {
        // Only handle occupied clicks or non-drag clicks
        // If we just finished a drag, handleCellClick might fire on mouseup. 
        // We can usually ignore it if it was a drag, but the click is fine if it just sets selection (duplicate work).
        // However, specifically for Occupied, we must handle it.
        if (isOccupied) {
            if (reservationId && onOccupiedCellClick) {
                onOccupiedCellClick(reservationId, e);
            }
            return;
        }
    };

    const fromMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}:${m === 0 ? '00' : m}`;
    };

    const handleReserveClick = () => {
        if (selectedSlots.length === 0) return;

        // Sort slots by time
        const sorted = [...selectedSlots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

        // 1. Check contiguous
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = toMinutes(sorted[i].time);
            const next = toMinutes(sorted[i + 1].time);
            if (next !== current + 30) {
                alert("연속된 시간만 예약 가능합니다.");
                return;
            }
        }

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        // End time is Last Start Time + 30 mins
        const endTimeMinutes = toMinutes(last.time) + 30;
        const endTime = fromMinutes(endTimeMinutes);

        if (onReserve) {
            onReserve({
                startTime: first.time,
                endTime: endTime,
                date: first.date,
                court: first.court
            });
            // Clear selection after triggering external handler
            setSelectedSlots([]);
        } else {
            setModalState({
                isOpen: true,
                startTime: first.time,
                endTime: endTime,
                day: DAYS[first.dayIndex].label,
                date: first.date,
                court: first.court,
            });
        }
    };

    const getDurationLabel = () => {
        const totalMinutes = selectedSlots.length * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h === 0) return `${m}분`;
        if (m === 0) return `${h}시간`;
        return `${h}시간 ${m}분`;
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
                    <div
                        className="bg-gray-50 p-2 text-center font-bold text-xs md:text-sm border-r border-b border-gray-200 flex items-center justify-center sticky z-20 h-[60px]"
                        style={{ top: `${headerOffset}px` }}
                    >
                        시간
                    </div>

                    {/* Day Headers */}
                    {DAYS.map((day, dIdx) => (
                        <div
                            key={`header-${day.key}`}
                            className={cn(
                                "bg-gray-50 text-center font-bold text-sm border-r border-b border-gray-200 flex flex-col items-center justify-center sticky z-20 h-[60px]",
                                // Span 2 columns (Pink + Mint)
                                "col-span-2",
                                // Visibility logic
                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                            )}
                            style={{ top: `${headerOffset}px` }}
                        >
                            <span>{day.label}</span>
                            <span className="text-xs text-gray-500 font-normal mt-1">
                                {formatDateShort(getDayDate(dIdx))}
                            </span>
                        </div>
                    ))}

                    {/* Court Sub-Headers (Pink/Mint) */}
                    {/* Time Spacer Row for Courts (Just another cell in col 1) */}
                    <div
                        className="bg-gray-50 border-r border-b border-gray-200 text-xs text-center flex items-center justify-center font-semibold sticky z-20 h-[30px]"
                        style={{ top: `${headerOffset + 60}px` }}
                    >
                        코트
                    </div>

                    {DAYS.map((day, dIdx) => (
                        <Fragment key={`court-header-group-${day.key}`}>
                            {/* Pink Header */}
                            <div
                                className={cn(
                                    "bg-gray-100 text-pink-600 font-bold text-xs border-r border-b border-gray-200 flex items-center justify-center sticky z-20 h-[30px]",
                                    dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                                )}
                                style={{ top: `${headerOffset + 60}px` }}
                            >
                                핑크
                            </div>
                            {/* Mint Header */}
                            <div
                                className={cn(
                                    "bg-gray-100 text-emerald-600 font-bold text-xs border-r border-b border-gray-200 flex items-center justify-center sticky z-20 h-[30px]",
                                    dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                                )}
                                style={{ top: `${headerOffset + 60}px` }}
                            >
                                민트
                            </div>
                        </Fragment>
                    ))}

                    {/* --- BODY --- */}
                    {schedule.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                            <AlertTriangle className="w-10 h-10 mb-3 text-gray-300" />
                            <p className="font-medium">일정 정보를 불러올 수 없습니다.</p>
                            <p className="text-sm text-gray-400 mt-1">잠시 후 다시 시도해주시거나 관리자에게 문의하세요.</p>
                        </div>
                    ) : schedule.map((slot, rowIndex) => (
                        // We use React.Fragment to flatten the loop into the grid
                        <div key={`row-${rowIndex}`} className="contents">
                            {/* Time Slot */}
                            <div className="bg-gray-50 text-gray-500 text-xs md:text-xs font-medium border-r border-b border-gray-100 flex items-center justify-center py-0 h-[20px]">
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
                                    const isSelected = selectedSlots.some(
                                        s => s.time === slot.time && s.dayIndex === dIdx && s.court === courtType
                                    );

                                    // Helper for contrast - prefers black for anything even remotely light
                                    const getContrastYIQ = (hexcolor: string) => {
                                        if (!hexcolor) return 'black';
                                        hexcolor = hexcolor.replace('#', '');
                                        var r = parseInt(hexcolor.substr(0, 2), 16);
                                        var g = parseInt(hexcolor.substr(2, 2), 16);
                                        var b = parseInt(hexcolor.substr(4, 2), 16);
                                        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                        // Increased threshold from 128 to 150 to make more colors use black text
                                        // Also specifically force black for typical cyan/mint bright colors
                                        return (yiq >= 100) ? 'black' : 'white';
                                    }

                                    // Custom Color Logic
                                    const contrastColor = courtData.color ? getContrastYIQ(courtData.color) : 'white';
                                    // FORCE BLACK Text if the calculated contrast color is black? No, if YIQ says black, we use black.
                                    // Let's rely on the stricter YIQ threshold (>= 100) as many bright colors are above 128.

                                    const customStyle = isOccupied && courtData.color ? { backgroundColor: courtData.color, color: contrastColor } : undefined;

                                    // Fallback Classes
                                    const bgColorClass = courtType === "pink"
                                        ? (isOccupied ? "bg-pink-100" : isSelected ? "bg-pink-500 shadow-md font-bold" : "bg-white hover:bg-pink-50")
                                        : (isOccupied ? "bg-emerald-100" : isSelected ? "bg-emerald-500 shadow-md font-bold" : "bg-white hover:bg-emerald-50");

                                    // For default occupied (pink-100 / emerald-100), text should be dark.
                                    const textColorClass = isSelected ? "text-white" : (courtType === "pink" ? "text-pink-900" : "text-emerald-900");
                                    const finalTextColor = (isOccupied && courtData.color) ? "" : textColorClass; // If custom color, style handles color.

                                    return (
                                        <div
                                            key={`${day.key}-${courtType}-${slot.time}`} // Unique key
                                            style={{
                                                gridRow: `span ${courtData.rowSpan}`,
                                                ...customStyle
                                            }}
                                            onMouseDown={(e) => handleCellMouseDown(slot.time, dIdx, courtType, isOccupied, courtData.reservationId, e)}
                                            onMouseEnter={() => handleCellMouseEnter(slot.time, dIdx, courtType, isOccupied)}
                                            onClick={(e) => handleCellClick(slot.time, dIdx, courtType, isOccupied, courtData.reservationId, e)}
                                            className={cn(
                                                "border-r border-b border-gray-100 flex items-center justify-center text-center px-0.5 py-0 cursor-pointer transition-all relative z-10 select-none",
                                                !customStyle && bgColorClass,
                                                !customStyle && finalTextColor,
                                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex",
                                                // Reduced height from 35px to 20px
                                                courtData.rowSpan === 1 && "h-[20px]",
                                                isSelected && "scale-[1.02] z-20"
                                            )}
                                        >
                                            {/* Time Label (Background) - Visible when not heavily occupied to guide selection */}
                                            {!isOccupied && (
                                                <span className={cn(
                                                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none select-none",
                                                    isSelected ? "text-white/60" : "text-gray-300"
                                                )}>
                                                    {slot.time}
                                                </span>
                                            )}

                                            {isOccupied ? (
                                                <span className="font-bold text-[11px] md:text-xs leading-none break-all block w-full overflow-hidden relative z-10">
                                                    {courtData.text}
                                                </span>
                                            ) : isSelected ? (
                                                <span className="text-[10px] relative z-10">선택</span>
                                            ) : null}
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
                startTime={modalState.startTime}
                endTime={modalState.endTime}
                selectedDay={modalState.day}
                selectedDate={modalState.date}
                selectedCourt={modalState.court}
            />

            {/* Floating Reservation Button */}
            {selectedSlots.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <button
                        onClick={handleReserveClick}
                        className="bg-gray-900 text-white px-8 py-3 rounded-full shadow-xl font-bold text-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                        <span>{getDurationLabel()} 선택됨</span>
                        <span className="w-1 h-4 bg-gray-600 rounded-full" />
                        <span className="text-pink-400">예약하기</span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            )}
        </>
    );
}
