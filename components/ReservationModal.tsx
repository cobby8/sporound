"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/utils/format";
import { GlassModalWrapper } from "./ui/GlassModalWrapper";
import { PackageCard } from "./ui/PackageCard";

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    startTime: string;
    endTime: string;
    selectedDay: string;
    selectedDate: string;
    selectedCourt: "pink" | "mint";
}

export function ReservationModal({
    isOpen,
    onClose,
    startTime,
    endTime,
    selectedDay,
    selectedDate,
    selectedCourt,
}: ReservationModalProps) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        teamName: "",
        contact: "",
        purpose: "",
        peopleCount: 1,
        useWaitingRoom: false,
        isLongTerm: false,
        isAdjustmentRequested: false,
        adjustmentReason: "",
    });
    const [totalPrice, setTotalPrice] = useState(0);
    const [duration, setDuration] = useState(1);

    // Check user on open
    useEffect(() => {
        if (isOpen) {
            checkUser();
        }
    }, [isOpen]);

    const checkUser = async () => {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        setUser(data.user);

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            setFormData(prev => ({
                ...prev,
                name: profile?.name || data.user?.user_metadata?.full_name || "",
                contact: profile?.phone || data.user?.user_metadata?.phone || "",
            }));
        }
        setLoading(false);
    };

    const [reservationType, setReservationType] = useState<"daily" | "monthly" | "3month">("daily");

    // Price Calculation Logic
    const { getPrice, loading: pricingLoading } = useDynamicPricing();

    useEffect(() => {
        if (!isOpen) return;

        const calculatePrice = () => {
            const dateObj = new Date(selectedDay); // Note: selectedDay is 'YYYY-MM-DD' or similar? 
            // Actually in previous code selectedDay was string '토요일' or similar?
            // Re-checking props: selectedDate is 'YYYY-MM-DD', selectedDay is '월요일'.
            // We need a Date object for the calculator to determine day of week.
            const targetDate = new Date(selectedDate);

            // Helper: "HH:mm" -> minutes for duration calc
            const toMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
            };
            const startMinutes = toMinutes(startTime);
            const endMinutes = toMinutes(endTime);
            const durationMinutes = endMinutes - startMinutes;
            const hours = durationMinutes / 60;

            setDuration(hours);

            const isEvent = formData.peopleCount >= 50;

            let price = 0;
            let waitingRoomPrice = 0;

            if (isEvent) {
                // Event Pricing (Legacy Logic maintained for large events for now, or move to DB later)
                // Assuming events are still custom/flat rate as per original code
                if (formData.peopleCount >= 200) price = 400000 * hours; // Assuming original was flat? 
                // Original logic: "if (formData.peopleCount >= 200) unitPrice = 400000;" -> unit price per hour?
                // Or flat? The original code did "let price = unitPrice * hours".
                // So yes, unitPrice was per-hour.
                let unitPrice = 0;
                if (formData.peopleCount >= 200) unitPrice = 400000;
                else if (formData.peopleCount >= 150) unitPrice = 300000;
                else if (formData.peopleCount >= 100) unitPrice = 250000;
                else unitPrice = selectedCourt === 'pink' ? 110000 : 90000;
                price = unitPrice * hours;
            } else {
                // Dynamic Rule Calculation
                const { total } = getPrice(targetDate, startTime, endTime, selectedCourt as 'pink' | 'mint');
                price = total;

                // Waiting Room Logic
                waitingRoomPrice = 20000;
                // Monthly/3-Month discounts for waiting room
                if (reservationType === 'monthly' || reservationType === '3month') {
                    waitingRoomPrice = 10000;
                }

                // Long-term Contract Discounts (Applied to the Rule Price)
                if (reservationType === 'monthly') {
                    // 10% discount on the calculated price
                    price = price * 0.9;
                } else if (reservationType === '3month') {
                    // 20% discount on the calculated price
                    price = price * 0.8;
                }
            }

            // Waiting Room Cost Addition
            if (formData.useWaitingRoom) {
                if (!isEvent) { // Event includes it? Original logic: "if (isEvent) { // Included }"
                    if (hours >= 4 || reservationType === '3month') {
                        // Free for >4h or 3-month contract (Updated Policy)
                    } else {
                        price += waitingRoomPrice;
                    }
                }
            }

            setTotalPrice(Math.floor(price / 100) * 100);
        };

        if (!pricingLoading) {
            calculatePrice();
        }
    }, [isOpen, startTime, endTime, selectedDate, selectedCourt, formData.peopleCount, formData.useWaitingRoom, reservationType, pricingLoading, getPrice]);

    const copyAccount = () => {
        navigator.clipboard.writeText("394-910573-99907");
        alert("계좌번호가 복사되었습니다.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        // 1. Get court ID
        const { data: courtData } = await supabase
            .from('courts')
            .select('id')
            .eq('name', selectedCourt)
            .single();

        if (!courtData) {
            alert('코트 정보를 찾을 수 없습니다.');
            return;
        }

        // 2. Insert Reservation
        const { error } = await supabase
            .from('reservations')
            .insert({
                court_id: courtData.id,
                date: selectedDate,
                start_time: startTime,
                end_time: endTime,
                purpose: formData.purpose,
                user_id: user.id,
                people_count: formData.peopleCount,
                total_price: totalPrice,
                status: 'pending',
                team_name: formData.teamName || null,
                payment_status: formData.isAdjustmentRequested ? 'adjustment_requested' : 'unpaid',
                adjustment_reason: formData.isAdjustmentRequested ? formData.adjustmentReason : null
            });

        if (error) {
            console.error(error);
            alert('예약 신청 중 오류가 발생했습니다.');
        } else {
            alert(`예약이 접수되었습니다!${formData.isAdjustmentRequested ? '\n\n[안내] 대관비 조정 요청이 접수되었습니다.\n관리자 확인 후 최종 금액이 안내될 예정입니다.' : `\n\n[입금안내]\n하나은행 394-910573-99907 이창민\n입금액: ${totalPrice.toLocaleString()}원\n\n입금이 확인되면 예약이 확정됩니다.`}`);
            onClose();
            setFormData({ name: "", teamName: "", contact: "", purpose: "", peopleCount: 1, useWaitingRoom: false, isLongTerm: false, isAdjustmentRequested: false, adjustmentReason: "" });
        }
    };

    const courtName = selectedCourt === "pink" ? "핑크 코트" : "민트 코트";

    // Mapped Packages for UI (Visualizing Reservation Types as Packages)
    const packageOptions = [
        {
            id: 'daily',
            title: '일일 대관',
            price: totalPrice, // Shows current calculated price
            description: '1회성 자유 예약',
            badge: 'BASIC',
            discountRate: 0
        },
        {
            id: 'monthly',
            title: '1개월 정기',
            price: Math.floor(totalPrice * (reservationType === 'daily' ? 0.9 : 1)), // Preview price if switched? 
            // Better: Let the main price update, here just show generic info or relative?
            // Actually, best to show the *potential* price or just descriptors.
            description: '월 4회 이상 (10% 할인)',
            badge: '10% OFF',
            discountRate: 10
        },
        {
            id: '3month',
            title: '3개월 정기',
            price: Math.floor(totalPrice * (reservationType === 'daily' ? 0.8 : 1)),
            description: '장기 계약 (20% 할인)',
            badge: '20% OFF',
            discountRate: 20
        }
    ];

    return (
        <GlassModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Court Reservation"
            className="border-t border-white/10"
        >
            <div className="space-y-8 pb-20"> {/* pb-20 for fixed bottom bar */}

                {/* 1. Header Info */}
                <div className="text-center space-y-1">
                    <p className="text-white/60 text-sm">{selectedDate} ({selectedDay})</p>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {startTime} - {endTime} <span className="text-base font-normal text-white/50">({duration}h)</span>
                    </h2>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${selectedCourt === 'pink' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {courtName}
                    </div>
                </div>

                {/* 2. Package Selection (Horizontal Scroll) */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white/70 px-1">Select Package</label>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x">
                        {packageOptions.map((pkg) => (
                            <PackageCard
                                key={pkg.id}
                                title={pkg.title}
                                price={pkg.id === reservationType ? totalPrice : 0} // Only show price on selected for clarity, or show generic
                                // Actually, showing the price estimate for each would be cool but requires complex calc. 
                                // For now, simple text or hiding price if not selected.
                                // Let's hide specific price on unselected cards to avoid confusion, or just show description.
                                description={pkg.description}
                                isSelected={reservationType === pkg.id}
                                onSelect={() => setReservationType(pkg.id as any)}
                                discountRate={pkg.discountRate}
                                colorTheme={selectedCourt}
                            />
                        ))}
                    </div>
                </div>

                {/* 3. Details Form (Glass Inputs) */}
                <div className="space-y-5">

                    {/* User Info Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-white/50 pl-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                                placeholder="신청자명"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-white/50 pl-1">Contact</label>
                            <input
                                type="tel"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: formatPhoneNumber(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                                placeholder="연락처"
                            />
                        </div>
                    </div>

                    {/* Team & People */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/50 pl-1">Team Name <span className="text-white/30">(Optional)</span></label>
                        <input
                            type="text"
                            value={formData.teamName}
                            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                            placeholder="팀명 또는 단체명"
                        />
                    </div>

                    {/* People Count Slider/Counter */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <label className="text-sm text-white/80 font-medium block">인원 수</label>
                            <span className="text-xs text-white/40">50명 이상 시 행사 요금 적용</span>
                        </div>
                        <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                            <button
                                onClick={() => setFormData(p => ({ ...p, peopleCount: Math.max(1, p.peopleCount - 1) }))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-bold w-8 text-center">{formData.peopleCount}</span>
                            <button
                                onClick={() => setFormData(p => ({ ...p, peopleCount: p.peopleCount + 1 }))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Waiting Room Toggle */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer" onClick={() => setFormData(p => ({ ...p, useWaitingRoom: !p.useWaitingRoom }))}>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white/90">2층 대기실 사용</span>
                            <span className="text-xs text-white/40">
                                {duration >= 4 || reservationType === '3month' ? <span className="text-emerald-400 font-bold">무료 제공 (조건 충족)</span> : "+20,000원"}
                            </span>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.useWaitingRoom ? (selectedCourt === 'pink' ? 'bg-pink-500' : 'bg-emerald-500') : 'bg-white/10'}`}>
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.useWaitingRoom ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/50 pl-1">Purpose</label>
                        <textarea
                            rows={2}
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm resize-none"
                            placeholder="대관 목적 (농구 경기, 촬영 등)"
                        />
                    </div>

                    {/* Adjustment Request */}
                    <div className="flex items-start gap-3 pt-2">
                        <div className="flex items-center h-5">
                            <input
                                type="checkbox"
                                id="adj"
                                checked={formData.isAdjustmentRequested}
                                onChange={(e) => setFormData({ ...formData, isAdjustmentRequested: e.target.checked })}
                                className="w-4 h-4 rounded border-white/30 text-pink-500 focus:ring-pink-500 bg-white/5"
                            />
                        </div>
                        <div className="flex flex-col w-full">
                            <label htmlFor="adj" className="text-sm font-medium text-white/80">대관비 조정 요청</label>
                            {formData.isAdjustmentRequested && (
                                <input
                                    type="text"
                                    value={formData.adjustmentReason}
                                    onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                                    placeholder="조정 사유를 입력해주세요"
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                                />
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* 4. Bottom Fixed Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur-xl border-t border-white/10 z-20">
                <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                    <div className="flex flex-col">
                        <span className="text-xs text-white/50">Total Payment</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white tracking-tight">{totalPrice.toLocaleString()}</span>
                            <span className="text-sm text-white/60">원</span>
                        </div>
                        <button onClick={copyAccount} className="text-[10px] text-white/40 underline text-left hover:text-white/80">
                            계좌복사: 하나은행 394-910573-99907
                        </button>
                    </div>
                    <button
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={loading}
                        className={`px-8 py-3 rounded-2xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${selectedCourt === 'pink'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-pink-500/25'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25'
                            }`}
                    >
                        {loading ? 'Processing...' : 'Reserve Now'}
                    </button>
                </div>
            </div>

        </GlassModalWrapper>
    );
}

