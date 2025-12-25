"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/utils/format";

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
        </AnimatePresence>
    );
}
