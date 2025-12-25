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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
                    >
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            {/* Modal Content */}
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md w-full"
                            >
                                <div className={`p-6 text-white ${selectedCourt === 'pink' ? 'bg-pink-500' : 'bg-emerald-500'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xl font-bold">예약 신청</h3>
                                        <button
                                            onClick={onClose}
                                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-white/90">
                                            {selectedDate} ({selectedDay})
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-bold">
                                                {startTime} - {endTime} ({duration}시간) · {courtName}
                                            </p>
                                            <p className="text-xl font-bold bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                                                {totalPrice.toLocaleString()}원
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyAccount}
                                            className="text-xs text-white/80 hover:text-white underline mt-1"
                                        >
                                            하나은행 394-910573-99907 (복사)
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                {loading ? (
                                    <div className="p-10 flex justify-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full"></div>
                                    </div>
                                ) : user ? (
                                    /* Logged in Form */
                                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                        {/* Reservation Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                대관 구분
                                            </label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900"
                                                value={reservationType}
                                                onChange={(e) => setReservationType(e.target.value as any)}
                                            >
                                                <option value="daily">일일 대관 (기본)</option>
                                                <option value="monthly">월 단위 정기 대관</option>
                                                <option value="3month">3개월 단위 정기 대관</option>
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    단체명 (팀명) <span className="text-gray-400 font-normal text-xs">(선택)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                                    placeholder="팀명 또는 단체명을 입력해주세요"
                                                    value={formData.teamName}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, teamName: e.target.value })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                신청자 성함
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                                placeholder="홍길동"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    연락처
                                                </label>
                                                <input
                                                    type="tel"
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                                    placeholder="010-0000-0000"
                                                    value={formData.contact}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, contact: formatPhoneNumber(e.target.value) })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                                    사용 인원
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                                    value={formData.peopleCount}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, peopleCount: parseInt(e.target.value) || 1 })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Waiting Room Option */}
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                id="waitingRoom"
                                                className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                                checked={formData.useWaitingRoom}
                                                onChange={(e) => setFormData({ ...formData, useWaitingRoom: e.target.checked })}
                                            />
                                            <label htmlFor="waitingRoom" className="text-sm text-gray-900 font-medium select-none">
                                                2층 대기실 사용 {duration >= 4 ? <span className="text-pink-600 font-bold">(무료)</span> : <span className="text-gray-600">(+20,000원)</span>}
                                            </label>
                                        </div>

                                        {/* Pricing Notice */}
                                        {formData.peopleCount >= 50 && (
                                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                                ℹ️ 50인 이상 행사 요금이 적용되었습니다.
                                            </div>
                                        )}

                                        {/* Fee Adjustment Request */}
                                        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="adjustmentRequest"
                                                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                                    checked={formData.isAdjustmentRequested}
                                                    onChange={(e) => setFormData({ ...formData, isAdjustmentRequested: e.target.checked })}
                                                />
                                                <label htmlFor="adjustmentRequest" className="text-sm text-gray-900 font-bold select-none cursor-pointer">
                                                    대관비 조정 요청
                                                </label>
                                            </div>
                                            {formData.isAdjustmentRequested && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        조정 사유
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        required={formData.isAdjustmentRequested}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none text-gray-900 placeholder:text-gray-400"
                                                        placeholder="장기 대관 할인, 학생 할인 적용 등"
                                                        value={formData.adjustmentReason}
                                                        onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                대관 목적
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                                placeholder="농구 동호회 경기, 개인 연습 등"
                                                value={formData.purpose}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, purpose: e.target.value })
                                                }
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transform transition-transform hover:scale-[1.02] active:scale-[0.98] ${selectedCourt === 'pink'
                                                ? 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/30'
                                                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                                                }`}
                                        >
                                            예약 신청하기
                                        </button>
                                    </form>
                                ) : (
                                    /* Not Logged In Message */
                                    <div className="p-8 text-center space-y-4">
                                        <div className="text-gray-500 mb-2">
                                            <p>로그인이 필요한 서비스입니다.</p>
                                            <p className="text-sm">예약 내역 관리와 중복 방지를 위해<br />로그인 후 이용해주세요.</p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="inline-block px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                                        >
                                            확인 (닫기)
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
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
