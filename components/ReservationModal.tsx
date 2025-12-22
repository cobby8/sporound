"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTime: string;
    selectedDay: string;
    selectedDate: string;
    selectedCourt: "pink" | "mint";
}

export function ReservationModal({
    isOpen,
    onClose,
    selectedTime,
    selectedDay,
    selectedDate,
    selectedCourt,
}: ReservationModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        contact: "",
        purpose: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Get court ID for selected court
        // TODO: This should be dynamic. For now we hardcode 'pink' and 'mint' UUIDs or query them? 
        // Better to query 'courts' table by name 'pink'/'mint' to get ID.
        // Or simpler: We know the schema seeds 'pink' and 'mint'.
        // Implementation Plan Step: We need a helper to get court ID. 
        // For MVP, let's fetch it on the fly or just assume we'll have a map.
        // Actually, let's just do a direct query here to keep it self-contained for now.

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
                start_time: selectedTime,
                end_time: calculateEndTime(selectedTime), // Helper needed
                purpose: formData.purpose,
                user_id: (await supabase.auth.getUser()).data.user?.id || null // Null allowed for anon for now? Schema says user_id is nullable.
            });

        if (error) {
            console.error(error);
            alert('예약 신청 중 오류가 발생했습니다.');
        } else {
            alert(`예약 문의가 접수되었습니다.\n담당자가 확인 후 연락드리겠습니다.\n(${selectedDay} ${selectedTime} - ${selectedCourt === 'pink' ? '핑크' : '민트'}코트)`);
            onClose();
            setFormData({ name: "", contact: "", purpose: "" });
        }
    };

    // Helper (temporary placement)
    const calculateEndTime = (startTime: string) => {
        const [h, m] = startTime.split(':').map(Number);
        return `${h + 1}:00`; // Default 1 hour duration
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
                            {/* Header */}
                            <div className={`p-6 text-white ${selectedCourt === 'pink' ? 'bg-pink-500' : 'bg-emerald-500'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-bold">예약 문의</h3>
                                    <button
                                        onClick={onClose}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <p className="opacity-90">
                                    {selectedDay} {selectedTime} · {courtName}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        연락처
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all focus:ring-blue-500"
                                        placeholder="010-1234-5678"
                                        value={formData.contact}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contact: e.target.value })
                                        }
                                    />
                                </div>

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
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
