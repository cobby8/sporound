"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

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
        contact: "",
        purpose: "",
        peopleCount: 1,
        useWaitingRoom: false,
        isLongTerm: false,
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
            setFormData(prev => ({
                ...prev,
                name: data.user?.user_metadata?.full_name || "",
                // If phone is available in metadata, set it here too
            }));
        }
        setLoading(false);
    };

    const [reservationType, setReservationType] = useState<"daily" | "monthly" | "3month">("daily");

    // Price Calculation Logic
    useEffect(() => {
        if (!isOpen) return;

        const calculatePrice = () => {
            const startHour = parseInt(startTime.split(':')[0]);
            const endHour = parseInt(endTime.split(':')[0]);
            const hours = endHour - startHour;
            setDuration(hours);

            const isWeekend = selectedDay === '토요일' || selectedDay === '일요일';
            const isEvent = formData.peopleCount >= 50;

            let unitPrice = 0;
            let waitingRoomPrice = 0;

            if (isEvent) {
                // Event Pricing
                if (formData.peopleCount >= 200) unitPrice = 400000;
                else if (formData.peopleCount >= 150) unitPrice = 300000;
                else if (formData.peopleCount >= 100) unitPrice = 250000;
                else unitPrice = selectedCourt === 'pink' ? 110000 : 90000;

                // Event waiting room included? Table says "Rental Included" (대관료 포함) for Event
                waitingRoomPrice = 0;
            } else {
                // Standard Pricing
                if (reservationType === 'daily') {
                    waitingRoomPrice = 20000;
                    let basePrice = selectedCourt === 'pink' ? 85000 : 75000;

                    // Discount Logic for Daily
                    let isDiscount = false;
                    if (isWeekend) {
                        if (startHour < 8 || startHour >= 21) isDiscount = true;
                    } else {
                        if (startHour < 9 || startHour >= 22) isDiscount = true;
                    }

                    if (isDiscount) {
                        unitPrice = selectedCourt === 'pink' ? 60000 : 50000;
                    } else {
                        unitPrice = basePrice;
                    }

                } else if (reservationType === 'monthly') {
                    // Monthly
                    waitingRoomPrice = 10000;
                    unitPrice = selectedCourt === 'pink' ? 75000 : 65000;
                } else {
                    // 3-Month
                    waitingRoomPrice = 10000;
                    unitPrice = selectedCourt === 'pink' ? 70000 : 60000;
                }
            }

            let price = unitPrice * hours;

            // Waiting Room Logic
            if (formData.useWaitingRoom) {
                if (isEvent) {
                    // Included
                } else {
                    if (hours >= 4) {
                        // Free
                    } else {
                        price += waitingRoomPrice;
                    }
                }
            }

            setTotalPrice(price);
        };

        calculatePrice();
    }, [isOpen, startTime, endTime, selectedDay, selectedCourt, formData.peopleCount, formData.useWaitingRoom, reservationType]);

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
                status: 'pending'
            });

        if (error) {
            console.error(error);
            alert('예약 신청 중 오류가 발생했습니다.');
        } else {
            alert(`예약이 접수되었습니다!\n\n[입금안내]\n하나은행 394-910573-99907 이창민\n입금액: ${totalPrice.toLocaleString()}원\n\n입금이 확인되면 예약이 확정됩니다.`);
            onClose();
            setFormData({ name: "", contact: "", purpose: "", peopleCount: 1, useWaitingRoom: false, isLongTerm: false });
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
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
                                            value={reservationType}
                                            onChange={(e) => setReservationType(e.target.value as any)}
                                        >
                                            <option value="daily">일일 대관 (기본)</option>
                                            <option value="monthly">월 단위 정기 대관</option>
                                            <option value="3month">3개월 단위 정기 대관</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            신청자 성함
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
                                            placeholder="홍길동"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                연락처
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
                                                placeholder="010-0000-0000"
                                                value={formData.contact}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, contact: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                사용 인원
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
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
                                        <label htmlFor="waitingRoom" className="text-sm text-gray-700 select-none">
                                            2층 대기실 사용 {duration >= 4 ? <span className="text-pink-600 font-bold">(무료)</span> : <span className="text-gray-500">(+20,000원)</span>}
                                        </label>
                                    </div>

                                    {/* Pricing Notice */}
                                    {formData.peopleCount >= 50 && (
                                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                            ℹ️ 50인 이상 행사 요금이 적용되었습니다.
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            대관 목적
                                        </label>
                                        <textarea
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
