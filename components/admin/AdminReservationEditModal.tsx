"use client";

import { useState, useEffect } from "react";
import { ReservationDB } from "@/lib/services/reservation";
import { supabase } from "@/lib/supabase";
import { X, Save, AlertCircle } from "lucide-react";

interface AdminReservationEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: ReservationDB | null;
    onUpdate: () => void; // Trigger refresh
}

export function AdminReservationEditModal({ isOpen, onClose, reservation, onUpdate }: AdminReservationEditModalProps) {
    const [loading, setLoading] = useState(false);

    // Form States
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [courtId, setCourtId] = useState("");
    const [peopleCount, setPeopleCount] = useState<number>(0);
    const [finalFee, setFinalFee] = useState<number>(0);
    const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'adjustment_requested'>('unpaid');
    const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'canceled'>('pending');
    const [teamName, setTeamName] = useState("");

    useEffect(() => {
        if (reservation) {
            setDate(reservation.date);
            setStartTime(reservation.start_time);
            setEndTime(reservation.end_time);
            setCourtId(reservation.court_id); // Note: might need to map name to UUID if not available
            setPeopleCount(reservation.people_count || 0);
            setFinalFee(reservation.final_fee || reservation.total_price || 0);
            setPaymentStatus(reservation.payment_status || 'unpaid');
            setStatus(reservation.status);
            setTeamName(reservation.team_name || "");
        }
    }, [reservation]);

    if (!isOpen || !reservation) return null;

    const handleSave = async () => {
        if (!confirm("변경사항을 저장하시겠습니까?")) return;

        setLoading(true);
        try {
            // Calculate Total Price if fee is not manually set? 
            // For admin edit, we assume they set the final fee directly.

            const updates: any = {
                date,
                start_time: startTime,
                end_time: endTime,
                people_count: peopleCount,
                final_fee: finalFee,
                payment_status: paymentStatus,
                status: status,
                team_name: teamName,
                // court_id: courtId // If we allow court change
            };

            const { error } = await supabase
                .from('reservations')
                .update(updates)
                .eq('id', reservation.id);

            if (error) throw error;

            alert("저장되었습니다.");
            onUpdate();
            onClose();

        } catch (error: any) {
            console.error("Update failed:", error);
            alert("수정 실패: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">예약 정보 수정</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* ... Content ... */}
                            {/* Basic Info */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">단체명 (팀명)</label>
                                    <input
                                        type="text"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md p-2 text-gray-900 font-bold"
                                        placeholder="팀명 또는 단체명을 입력하세요"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">예약자 정보 (수정불가)</label>
                                    <div className="text-gray-900 font-medium p-2 bg-gray-50 rounded flex justify-between items-center text-sm">
                                        <span>{reservation.profiles?.name || reservation.guest_name || "이름 없음"}</span>
                                        <span className="text-gray-500">
                                            {reservation.profiles?.phone || reservation.guest_phone || "연락처 없음"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Payment Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">예약 상태</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm font-bold text-gray-900 focus:ring-pink-500 focus:border-pink-500"
                                    >
                                        <option value="pending">승인 대기</option>
                                        <option value="confirmed">예약 확정</option>
                                        <option value="canceled">취소됨</option>
                                        <option value="rejected">거절됨</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">결제 상태</label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                                        className={`w-full border border-gray-300 rounded-md p-2 text-sm font-bold focus:ring-pink-500 focus:border-pink-500 ${paymentStatus === 'paid' ? 'text-green-600' : 'text-gray-900'
                                            }`}
                                    >
                                        <option value="unpaid">미납</option>
                                        <option value="adjustment_requested">조정 요청</option>
                                        <option value="paid">납부 완료</option>
                                    </select>
                                </div>
                            </div>

                            {/* Fee Adjustment */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">최종 대관비 (원)</label>
                                <input
                                    type="number"
                                    value={finalFee}
                                    onChange={(e) => setFinalFee(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded-md p-2 text-gray-900 font-bold text-right"
                                />
                                {reservation.adjustment_reason && (
                                    <div className="mt-2 text-xs text-red-600 flex items-start gap-1">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>요청 사유: {reservation.adjustment_reason}</span>
                                    </div>
                                )}
                            </div>

                            {/* Time Editing */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-gray-800 sm:ml-3 sm:w-auto flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            저장
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            disabled={loading}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

