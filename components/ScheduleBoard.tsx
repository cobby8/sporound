"use client";

import { useState, Fragment, useEffect, useRef } from "react";
import { TimeSlot, CellData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { ReservationModal } from "@/components/ReservationModal";
import { GlassModalWrapper } from "@/components/ui/GlassModalWrapper";
import { supabase } from "@/lib/supabase";
import { useDynamicPricing } from "@/hooks/useDynamicPricing";
import { timeToMinutes } from "@/utils/pricingCalculator";
import { Tag, Sparkles } from "lucide-react";
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

    const { rules, loading: pricingLoading } = useDynamicPricing();
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // Find Best Price (Simple logic: lowest price per hour that is not 0)
    const bestPriceRule = rules
        .filter(r => r.price_per_hour > 0)
        .sort((a, b) => a.price_per_hour - b.price_per_hour)[0];

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
    const isDraggingRef = useRef(false); // Ref for instant access in event listeners

    const [dragStart, setDragStart] = useState<{
        time: string;
        dayIndex: number;
        court: "pink" | "mint";
        date: string;
    } | null>(null);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            isDraggingRef.current = false;
            setDragStart(null);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);

        // AGGRESSIVE SCROLL LOCK (Capture Phase)
        const preventScroll = (e: TouchEvent) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                e.stopPropagation(); // Try to stop it from reaching browser default handlers
            }
        };

        // Attach to window with capture=true to intercept before scrolling starts
        window.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchmove', preventScroll, { capture: true });
        };
    }, []);

    // Sync Ref with State
    useEffect(() => {
        isDraggingRef.current = isDragging;
        if (isDragging) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none"; // Global touch action disable
        } else {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        }
    }, [isDragging]);

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

    // Old useEffect removed. Logic moved to mount effect with Ref.

    // --- POINTER EVENTS IMPLEMENTATION (Robust Scroll Lock & Unified Logic) ---

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const startTouchPos = useRef<{ x: number, y: number } | null>(null);
    const draggedPointerId = useRef<number | null>(null);

    // Consolidated Handler for Interaction Start
    const handlePointerDown = (e: React.PointerEvent, time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean, reservationId?: string) => {
        if (isOccupied) return;

        // Only handle primary pointer (mouse left click or first touch)
        if (!e.isPrimary) return;

        const { clientX, clientY, pointerId } = e;
        startTouchPos.current = { x: clientX, y: clientY };
        draggedPointerId.current = pointerId;

        // Start Timer for Long Press (800ms)
        longPressTimer.current = setTimeout(() => {
            const targetDate = formatDateFull(getDayDate(dayIndex));
            const startSlot = { time, dayIndex, court, date: targetDate };

            setIsDragging(true);
            setDragStart(startSlot);
            setSelectedSlots([startSlot]); // Start fresh selection on drag start

            // CRITICAL: Capture the pointer! This prevents the browser from taking over for scrolling.
            // This effectively "locks" the scroll for the duration of this gesture.
            const target = e.target as HTMLElement;
            if (target && target.setPointerCapture) {
                target.setPointerCapture(pointerId);
            }

            // Haptic feedback
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        }, 800);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggedPointerId.current !== e.pointerId) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        // 1. If NOT dragging yet: Check threshold to cancel timer (Allow Scroll)
        if (!isDragging) {
            if (longPressTimer.current && startTouchPos.current) {
                const diffX = Math.abs(currentX - startTouchPos.current.x);
                const diffY = Math.abs(currentY - startTouchPos.current.y);

                // If moved > 10px, it's a SCROLL/PAN. Cancel the timer.
                if (diffX > 10 || diffY > 10) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    startTouchPos.current = null;
                }
            }
            return;
        }

        // 2. If Dragging: Process Selection
        // Since we captured pointer, we get events even if we leave the cell.

        // Find element under pointer
        const element = document.elementFromPoint(currentX, currentY);
        const cell = element?.closest('[data-slot-time]');

        if (cell) {
            const time = cell.getAttribute('data-slot-time');
            const dayIndexVal = Number(cell.getAttribute('data-day-index'));
            const court = cell.getAttribute('data-court') as "pink" | "mint";

            if (time && !isNaN(dayIndexVal) && court) {
                handleCellMouseEnter(time, dayIndexVal, court, false);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent, time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean, reservationId?: string) => {
        if (draggedPointerId.current !== e.pointerId) return;

        // Cleanup
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        startTouchPos.current = null;
        draggedPointerId.current = null;
        const target = e.target as HTMLElement;
        if (target && target.releasePointerCapture) {
            target.releasePointerCapture(e.pointerId);
        }

        if (isDragging) {
            // End of Drag Gesture
            setIsDragging(false);
            setDragStart(null);
            return;
        }

        // UNIFIED TAP LOGIC: If we reached here, it wasn't a drag, and it wasn't cancelled (scrolled).
        // Treat as CLICK / TAP.
        handleInteraction(time, dayIndex, court, isOccupied, reservationId);
    };

    const handlePointerCancel = (e: React.PointerEvent) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setIsDragging(false);
        setDragStart(null);
        startTouchPos.current = null;
        draggedPointerId.current = null;
    };

    // Unified Selection Logic (Replaces handleCellClick)
    const handleInteraction = (time: string, dayIndex: number, court: "pink" | "mint", isOccupied: boolean, reservationId?: string) => {
        if (isOccupied) {
            if (reservationId && onOccupiedCellClick) {
                // Pass mock event or ignore event arg
                onOccupiedCellClick(reservationId);
            }
            return;
        }

        const targetDate = formatDateFull(getDayDate(dayIndex));
        const clickedSlot = { time, dayIndex, court, date: targetDate };

        // Toggle Logic
        const isAlreadySelected = selectedSlots.some(s => s.time === time && s.dayIndex === dayIndex && s.court === court);

        if (isAlreadySelected) {
            const newSelection = selectedSlots.filter(s => !(s.time === time && s.court === court && s.dayIndex === dayIndex));
            setSelectedSlots(newSelection);
            return;
        }

        // Range Logic
        if (selectedSlots.length === 1) {
            const start = selectedSlots[0];
            // Ensure Strict Type Matching
            if (Number(start.dayIndex) === Number(dayIndex) && start.court === court) {
                const startMins = toMinutes(start.time);
                const endMins = toMinutes(time);
                const min = Math.min(startMins, endMins);
                const max = Math.max(startMins, endMins);

                const rangeSlots: typeof selectedSlots = [];

                schedule.forEach(slot => {
                    const t = toMinutes(slot.time);
                    if (t >= min && t <= max) {
                        const dayKey = DAYS[dayIndex]?.key;
                        if (!dayKey) return;
                        const courtData = court === 'pink' ? slot.courts[dayKey].pink : slot.courts[dayKey].mint;

                        if (!courtData?.text && !courtData?.reservationId) {
                            rangeSlots.push({
                                time: slot.time,
                                dayIndex: dayIndex,
                                court: court,
                                date: targetDate
                            });
                        }
                    }
                });

                if (rangeSlots.length > 0) {
                    setSelectedSlots(rangeSlots);
                    return;
                }
            }
        }

        // Default Click
        setSelectedSlots([clickedSlot]);
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
            <div className="w-full max-w-[1400px] mx-auto p-2 md:p-4 relative">
                {/* Legend (Desktop Only) */}
                <div className="hidden md:flex absolute top-4 right-4 flex-col gap-1 items-end z-30 pointer-events-none select-none opacity-90">
                    <div className="flex items-center gap-1.5 bg-[#0f1117]/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-sm">
                        <span className="text-[10px] text-gray-400 font-medium mr-1">Time Discount</span>
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded">SS -70%</span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">S -41%</span>
                        <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 rounded">A -29%</span>
                    </div>
                </div>

                {/* Header Title */}
                <h2 className="text-2xl font-bold mb-6 text-center text-white">
                    체육관 대관 현황 <span className="text-base font-normal text-gray-400 ml-2">({startDate} 주간)</span>
                </h2>

                {/* Mobile Day Selector */}
                <div className="flex md:hidden items-center justify-between mb-4 bg-white/5 border border-white/10 rounded-lg p-2">
                    <button
                        onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                        disabled={selectedDayIndex === 0}
                        className="p-2 disabled:opacity-30 text-white"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-lg text-white">
                        {currentDay.label} <span className="text-sm text-gray-400 font-normal">({formatDateShort(currentDate)})</span>
                    </span>
                    <button
                        onClick={() => setSelectedDayIndex((prev) => Math.min(DAYS.length - 1, prev + 1))}
                        disabled={selectedDayIndex === DAYS.length - 1}
                        className="p-2 disabled:opacity-30 text-white"
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
                    "border-t border-l border-white/10"
                )}>
                    {/* --- HEADERS --- */}

                    {/* Time Header (Corner) */}
                    <div
                        className="bg-[#0f1117]/90 backdrop-blur-sm p-2 text-center font-bold text-xs md:text-sm border-r border-b border-white/10 flex items-center justify-center sticky z-20 h-[60px] text-gray-300"
                        style={{ top: `${headerOffset}px` }}
                    >
                        시간
                    </div>

                    {/* Day Headers */}
                    {DAYS.map((day, dIdx) => (
                        <div
                            key={`header-${day.key}`}
                            className={cn(
                                "bg-[#0f1117]/90 backdrop-blur-sm text-center font-bold text-sm border-r border-b border-white/10 flex flex-col items-center justify-center sticky z-20 h-[60px]",
                                // Span 2 columns (Pink + Mint)
                                "col-span-2",
                                // Visibility logic
                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                            )}
                            style={{ top: `${headerOffset}px` }}
                        >
                            <span className="text-lg text-white font-bold">
                                {formatDateShort(getDayDate(dIdx))}
                            </span>
                            <span className="text-xs text-gray-400 font-normal mt-1">{day.label}</span>
                        </div>
                    ))}

                    {/* Court Sub-Headers (Pink/Mint) */}
                    {/* Time Spacer Row for Courts (Just another cell in col 1) */}
                    <div
                        className="bg-[#0f1117]/90 backdrop-blur-sm border-r border-b border-white/10 text-xs text-center flex items-center justify-center font-semibold sticky z-20 h-[30px] text-gray-400"
                        style={{ top: `${headerOffset + 60}px` }}
                    >
                        코트
                    </div>

                    {DAYS.map((day, dIdx) => (
                        <Fragment key={`court-header-group-${day.key}`}>
                            {/* Pink Header */}
                            <div
                                className={cn(
                                    "bg-pink-500/10 backdrop-blur-sm text-pink-400 font-bold text-xs border-r border-b border-white/10 flex items-center justify-center sticky z-20 h-[30px]",
                                    dIdx === selectedDayIndex ? "flex" : "hidden md:flex"
                                )}
                                style={{ top: `${headerOffset + 60}px` }}
                            >
                                핑크
                            </div>
                            {/* Mint Header */}
                            <div
                                className={cn(
                                    "bg-emerald-500/10 backdrop-blur-sm text-emerald-400 font-bold text-xs border-r border-b border-white/10 flex items-center justify-center sticky z-20 h-[30px]",
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
                            <div className="bg-white/5 text-gray-300 text-xs md:text-xs font-medium border-r border-b border-white/5 flex items-center justify-center py-0 h-[20px]">
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

                                    // Discount Label Logic
                                    const dayNum = (dIdx + 1) % 7;
                                    const slotMins = timeToMinutes(slot.time);

                                    const matchingRule = rules.find(r =>
                                        r.days_of_week.includes(dayNum) &&
                                        (r.court_id === null || r.court_id === 'global' || r.name.toLowerCase().includes(courtType)) &&
                                        timeToMinutes(r.start_time) <= slotMins &&
                                        timeToMinutes(r.end_time) > slotMins
                                    );

                                    const getTierInfo = (rule?: typeof rules[0]) => {
                                        if (!rule) return null;

                                        // Weekend Badges
                                        if (rule.name.includes('S-Weekend')) return { label: '-29%', colorClass: 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' };
                                        if (rule.name.includes('A-Weekend')) return { label: '-12%', colorClass: 'text-blue-300 bg-blue-500/20 border border-blue-500/30' };

                                        // Weekday Badges
                                        if (rule.name.includes('SS')) return { label: '-70%', colorClass: 'text-purple-300 bg-purple-500/20 border border-purple-500/30' };
                                        if (rule.name.includes('S Tier')) return { label: '-41%', colorClass: 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' };
                                        if (rule.name.includes('A Tier')) return { label: '-29%', colorClass: 'text-blue-300 bg-blue-500/20 border border-blue-500/30' };
                                        return null;
                                    };

                                    const tierInfo = getTierInfo(matchingRule);

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
                                        ? (isOccupied ? "bg-pink-500/20 backdrop-blur-sm border border-pink-500/30" : isSelected ? "bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] font-bold border border-pink-400" : "bg-transparent hover:bg-pink-500/10 transition-colors")
                                        : (isOccupied ? "bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30" : isSelected ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] font-bold border border-emerald-400" : "bg-transparent hover:bg-emerald-500/10 transition-colors");

                                    // For default occupied, text should be light (pastel) for contrast on dark bg.
                                    const textColorClass = isSelected ? "text-white" : (courtType === "pink" ? "text-pink-200" : "text-emerald-200");
                                    const finalTextColor = (isOccupied && courtData.color) ? "" : textColorClass; // If custom color, style handles color.

                                    return (
                                        <div
                                            key={`${day.key}-${courtType}-${slot.time}`} // Unique key
                                            data-slot-time={slot.time}
                                            data-day-index={dIdx}
                                            data-court={courtType}
                                            style={{
                                                gridRow: `span ${courtData.rowSpan}`,
                                                ...customStyle
                                            }}
                                            onMouseEnter={() => handleCellMouseEnter(slot.time, dIdx, courtType, isOccupied)}
                                            onPointerDown={(e) => handlePointerDown(e, slot.time, dIdx, courtType, isOccupied, courtData.reservationId)}
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={(e) => handlePointerUp(e, slot.time, dIdx, courtType, isOccupied, courtData.reservationId)}
                                            onPointerCancel={handlePointerCancel}
                                            className={cn(
                                                "border-r border-b border-gray-100 flex items-center justify-center text-center px-0.5 py-0 cursor-pointer transition-all relative z-10 select-none",
                                                // touch-action: pan-y allows vertical scroll but lets us capture pointer for horizontal/custom logic if we want.
                                                // Actually, we want default behavior until we capture. 
                                                // "touch-action-pan-y" is a Tailwind class (check if exists or use inline style)
                                                // Assuming standard tailwind:
                                                "touch-pan-y",
                                                !customStyle && bgColorClass,
                                                !customStyle && finalTextColor,
                                                dIdx === selectedDayIndex ? "flex" : "hidden md:flex",
                                                // Reduced height from 35px to 20px
                                                courtData.rowSpan === 1 && "h-[20px]",
                                                isSelected && "scale-[1.02] z-20"
                                            )}
                                        >
                                            {/* Time Label (Background) - Visible when not heavily occupied to guide selection */}
                                            {/* Time & Discount Labels */}
                                            {!isOccupied && (
                                                <>
                                                    {isSelected ? (
                                                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none select-none text-white/60">
                                                            {slot.time}
                                                        </span>
                                                    ) : tierInfo ? (
                                                        <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                                                            <span className={cn(
                                                                "text-[8px] md:text-[9px] font-extrabold px-1 rounded-[3px] leading-tight flex items-center h-[14px] mt-[3px]",
                                                                tierInfo.colorClass
                                                            )}>
                                                                {tierInfo.label}
                                                            </span>
                                                            <span className="text-[13px] font-medium select-none text-gray-300">
                                                                {slot.time}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none select-none text-gray-300">
                                                            {slot.time}
                                                        </span>
                                                    )}
                                                </>
                                            )}

                                            {isOccupied ? (
                                                <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden leading-tight">
                                                    <span className="font-bold text-[11px] md:text-xs truncate max-w-full relative z-10">
                                                        {courtData.text.replace('(대기) ', '')}
                                                    </span>
                                                    {courtData.text.includes('(대기)') && (
                                                        <span className="text-[9px] md:text-[10px] font-medium relative z-10 text-red-600 bg-white/50 px-1 rounded-sm mt-0.5">
                                                            (승인대기)
                                                        </span>
                                                    )}
                                                </div>
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
                {/* Spacer for floating button */}
                <div className="h-32 md:h-24 w-full" />
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

            {/* Floating Best Price Button */}
            {selectedSlots.length === 0 && !modalState.isOpen && bestPriceRule && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4">
                    <button
                        onClick={() => setShowPolicyModal(true)}
                        className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-xl rounded-full px-5 py-3 hover:bg-gray-800 transition-all active:scale-95 group"
                    >
                        <Sparkles className="w-4 h-4 text-emerald-400 group-hover:animate-spin-slow" />
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-white/50 leading-none mb-0.5">최저가 타임</span>
                            <span className="text-sm font-bold text-white leading-none">
                                {bestPriceRule.name} <span className="text-emerald-400">{bestPriceRule.price_per_hour.toLocaleString()}원~</span>
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {/* Policy Modal */}
            <GlassModalWrapper
                isOpen={showPolicyModal}
                onClose={() => setShowPolicyModal(false)}
                title="시간대별 가격 정책"
                className="max-w-md"
            >
                <div className="space-y-3">
                    {rules.length > 0 ? (() => {
                        const groupedRules = rules.reduce((acc, rule) => {
                            const baseName = rule.name.split(' - ')[0]; // "SS Tier (Pink)" from "SS Tier (Pink) - Night"
                            if (!acc[baseName]) {
                                acc[baseName] = {
                                    id: baseName, // Use baseName as a unique ID for the group
                                    name: baseName,
                                    price_per_hour: rule.price_per_hour,
                                    times: [],
                                    isBestPrice: false, // Will be updated later
                                    isHotPrice: false, // Will be updated later
                                };
                            }
                            acc[baseName].times.push(`${rule.start_time.slice(0, 5)} ~ ${rule.end_time.slice(0, 5)}`);
                            return acc;
                        }, {} as Record<string, { id: string; name: string; price_per_hour: number; times: string[]; isBestPrice: boolean; isHotPrice: boolean; }>);

                        // Determine best and hot prices
                        let minPrice = Infinity;
                        let maxPrice = 0;
                        if (rules.length > 0) {
                            minPrice = Math.min(...rules.map(r => r.price_per_hour));
                            maxPrice = Math.max(...rules.map(r => r.price_per_hour));
                        }

                        Object.values(groupedRules).forEach(group => {
                            if (group.price_per_hour === minPrice) {
                                group.isBestPrice = true;
                            }
                            // Define "hot" as being in the lower 25% of the price range, but not the absolute minimum
                            // Or, simpler, if it's an 'S Tier' rule and not the best price.
                            if (group.name.includes('S Tier') && !group.isBestPrice) {
                                group.isHotPrice = true;
                            }

                            // Merge "23:00 ~ 23:59" and "00:00 ~ 01:00" (Weekday) -> "23:00 ~ 01:00"
                            const hasNight1 = group.times.some(t => t.includes('23:00') && t.includes('23:59'));
                            const hasNight2 = group.times.some(t => t.includes('00:00') && t.includes('01:00'));

                            if (hasNight1 && hasNight2) {
                                group.times = group.times.filter(t =>
                                    !((t.includes('23:00') && t.includes('23:59')) ||
                                        (t.includes('00:00') && t.includes('01:00')))
                                );
                                group.times.push('23:00 ~ 01:00');
                            }

                            // Merge "22:00 ~ 23:59" and "00:00 ~ 02:00" (Weekend) -> "22:00 ~ 02:00"
                            const hasWkNight1 = group.times.some(t => t.includes('22:00') && t.includes('23:59'));
                            const hasWkNight2 = group.times.some(t => t.includes('00:00') && t.includes('02:00'));

                            if (hasWkNight1 && hasWkNight2) {
                                group.times = group.times.filter(t =>
                                    !((t.includes('22:00') && t.includes('23:59')) ||
                                        (t.includes('00:00') && t.includes('02:00')))
                                );
                                group.times.push('22:00 ~ 02:00');
                            }

                            // Sort times for consistent display
                            group.times.sort();
                        });

                        const displayRules = Object.values(groupedRules).sort((a, b) => {
                            // Sort by price_per_hour ascending, then by name
                            if (a.price_per_hour !== b.price_per_hour) {
                                return a.price_per_hour - b.price_per_hour;
                            }
                            return a.name.localeCompare(b.name);
                        });

                        return displayRules.map((group) => (
                            <div key={group.id} className={cn(
                                "flex items-center justify-between p-3 rounded-xl border",
                                group.isBestPrice ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"
                            )}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">{group.name}</span>
                                        {group.isBestPrice && (
                                            <span className="text-[10px] bg-emerald-500 text-black font-bold px-1.5 py-0.5 rounded-full">BEST</span>
                                        )}
                                        {group.isHotPrice && !group.isBestPrice && (
                                            <span className="text-[10px] bg-orange-500 text-black font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-white/50">
                                        {group.times.join(', ')}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-white">
                                    {group.price_per_hour.toLocaleString()}원
                                    <span className="text-[10px] font-normal text-white/40 ml-0.5">/시간</span>
                                </span>
                            </div>
                        ));
                    })() : (
                        <div className="text-center text-white/50 py-4">정책 로딩 중...</div>
                    )}
                </div>
                <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-white/40">
                    * 공휴일 및 주말은 별도 요금이 적용될 수 있습니다.
                </div>
            </GlassModalWrapper>

            {/* Floating Reservation Button - Updated Horizontal Design */}
            {selectedSlots.length > 0 && !modalState.isOpen && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 w-[90%] max-w-md">
                    <button
                        onClick={handleReserveClick}
                        className="w-full bg-gray-900 shadow-2xl rounded-2xl p-4 flex items-center justify-between border border-gray-800 active:scale-[0.98] transition-all duration-200 group"
                    >
                        <div className="flex flex-col items-start pl-2">
                            <span className="text-[11px] text-gray-400 font-medium mb-0.5">선택된 시간</span>
                            <span className="text-lg md:text-xl font-bold text-white tracking-tight font-sans">
                                {(() => {
                                    const sorted = [...selectedSlots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
                                    const start = sorted[0].time;
                                    const endMins = toMinutes(sorted[sorted.length - 1].time) + 30;
                                    const end = fromMinutes(endMins);
                                    return `${start} ~ ${end}`;
                                })()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-xl transition-colors">
                            <span className="font-bold text-sm md:text-base leading-none">예약하기</span>
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            )}
        </>
    );
}
