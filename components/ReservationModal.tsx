"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, Calendar, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/utils/format";
import { useDynamicPricing } from "@/hooks/useDynamicPricing";
import { ModernModalWrapper } from "@/components/ui/ModernModalWrapper";
import { PackageCard } from "@/components/reservation/PackageCard";
import { Package } from "@/utils/pricingCalculator";
import { cn } from "@/lib/utils";

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
    // Price Calculation Logic
    const { getPrice, packages, loading: pricingLoading } = useDynamicPricing();
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    // Package Selection Handler
    const handlePackageSelect = (pkg: Package) => {
        if (selectedPackage?.id === pkg.id) {
            setSelectedPackage(null);
            // Optional: Reset time to default?
        } else {
            setSelectedPackage(pkg);
            // Set time from package
            setStartTime(pkg.start_time.slice(0, 5));
            setEndTime(pkg.end_time.slice(0, 5));
        }
    };

    // Override price when package is selected
    useEffect(() => {
        if (selectedPackage) {
            setTotalPrice(selectedPackage.total_price);
        }
    }, [selectedPackage, startTime, endTime]);

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

    // Generate time options for dropdown
    // Generate time options for dropdown
    const generateTimeOptions = () => {
        const times = [];
        for (let i = 6; i < 24; i++) {
            const h = i.toString().padStart(2, '0');
            times.push(`${h}:00`);
            times.push(`${h}:30`);
        }
        // Add late night times if needed (00:00~02:00)
        times.push("00:00", "00:30", "01:00", "01:30", "02:00");
        return times;
    };

    if (!isOpen) return null;

    return (
        <ModernModalWrapper isOpen={isOpen} onClose={onClose} title="코트 예약">
            {user ? (
                <div className="p-6 space-y-6">
                    {/* 1. Package Selection Strategy */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-bold text-lg">패키지 선택</h3>
                            <span className="text-xs text-pink-400 font-medium">최대 58% 할인</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                            {packages.map(pkg => (
                                <PackageCard
                                    key={pkg.id}
                                    pkg={pkg}
                                    isSelected={selectedPackage?.id === pkg.id}
                                    onSelect={handlePackageSelect}
                                />
                            ))}
                            {packages.length === 0 && (
                                <div className="text-gray-500 text-sm py-4 w-full text-center bg-white/5 rounded-xl">진행 중인 패키지 프로모션이 없습니다.</div>
                            )}
                        </div>
                    </div>

                    {/* 2. Date & Time */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold text-lg">일시 선택</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>{selectedDate} ({selectedDay})</span>
                            </div>
                        </div>

                        {/* Time Picker */}
                        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${selectedPackage ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            {/* Start Time */}
                            <div className="relative">
                                <select
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-[#2a2a2a] text-white border border-white/10 rounded-xl px-4 py-3 appearance-none focus:border-pink-500 focus:outline-none transition-colors"
                                >
                                    {generateTimeOptions().map(time => (
                                        <option key={`start-${time}`} value={time}>{time}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>

                            {/* End Time */}
                            <div className="relative">
                                <select
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-[#2a2a2a] text-white border border-white/10 rounded-xl px-4 py-3 appearance-none focus:border-pink-500 focus:outline-none transition-colors"
                                >
                                    {generateTimeOptions().map(time => (
                                        <option key={`end-${time}`} value={time}>{time}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                        {selectedPackage && <div className="text-xs text-center text-pink-400 mt-1">* 패키지 선택 시 시간은 자동 고정됩니다.</div>}
                    </div>

                    {/* 3. User Info & Options */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Simple Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="신청자명"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-pink-500 focus:outline-none"
                            />
                            <input
                                type="tel"
                                placeholder="연락처"
                                required
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: formatPhoneNumber(e.target.value) })}
                                className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-pink-500 focus:outline-none"
                            />
                        </div>

                        {/* Team Name */}
                        <input
                            type="text"
                            placeholder="팀명 (선택사항)"
                            value={formData.teamName}
                            onChange={e => setFormData({ ...formData, teamName: e.target.value })}
                            className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-pink-500 focus:outline-none"
                        />

                        {/* Waiting Room Checkbox */}
                        <div
                            className={`flex items-center gap-3 p-4 rounded-xl border border-white/5 transition-colors cursor-pointer ${formData.useWaitingRoom ? 'bg-pink-500/10 border-pink-500/30' : 'bg-[#2a2a2a]'}`}
                            onClick={() => setFormData({ ...formData, useWaitingRoom: !formData.useWaitingRoom })}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.useWaitingRoom ? 'bg-pink-500 border-pink-500' : 'border-gray-500'}`}>
                                {formData.useWaitingRoom && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-gray-300 text-sm select-none">
                                대기실 사용 {duration >= 4 ? <span className="text-pink-400 font-bold">(무료)</span> : <span className="text-gray-500">(+20,000원)</span>}
                            </span>
                        </div>

                        {/* Bottom Total & Action */}
                        <div className="pt-4 border-t border-white/10 mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">총 결제 금액</span>
                                <span className="text-2xl font-bold text-white tracking-tight">
                                    {totalPrice.toLocaleString()}원
                                </span>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-500/20 active:scale-[0.98] transition-all"
                            >
                                예약하기
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="p-8 text-center text-gray-400 min-h-[200px] flex flex-col items-center justify-center">
                    <p className="mb-4">로그인이 필요한 서비스입니다.</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
                    >
                        닫기
                    </button>
                </div>
            )}
        </ModernModalWrapper>
    );
}
