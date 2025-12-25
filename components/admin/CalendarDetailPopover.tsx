"use client";

import { ReservationDB as Reservation } from "@/lib/services/reservation";
import { Copy, Edit2, Trash2, X, MapPin, User, FileText, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

interface CalendarDetailPopoverProps {
    reservation: Reservation | null;
    position: { x: number; y: number } | null;
    onClose: () => void;
    onEdit: (res: Reservation) => void;
    onCopy: (res: Reservation) => void;
    onDelete: (res: Reservation) => void;
    onApprove: (res: Reservation, fee: number, paymentStatus: string) => void;
    onUpdate?: (res: Reservation, updates: any) => void;
}

export function CalendarDetailPopover({ reservation, position, onClose, onEdit, onCopy, onDelete, onApprove, onUpdate }: CalendarDetailPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [editFee, setEditFee] = useState(reservation?.final_fee || reservation?.total_price || 0);
    const [editPayStatus, setEditPayStatus] = useState(reservation?.payment_status || 'unpaid');

    useEffect(() => {
        if (reservation) {
            setEditFee(reservation.final_fee || reservation.total_price || 0);
            setEditPayStatus(reservation.payment_status || 'unpaid');
        }
    }, [reservation]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (position) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [position, onClose]);

    if (!reservation || !position) return null;

    // Adjust position if it goes off screen (Simple adjust)
    // We assume 320px width and ~300px height
    const left = Math.min(position.x, window.innerWidth - 340);
    const top = Math.min(position.y, window.innerHeight - 350);

    return (
        <div
            ref={popoverRef}
            className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
            style={{ left: left, top: top }}
        >
            {/* Header with Color Bar */}
            <div className={`h-3 w-full rounded-t-xl ${reservation.courts?.name === 'pink' ? 'bg-pink-500' : 'bg-emerald-500'}`} />

            <div className="p-5">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-1 pr-6">
                    {reservation.team_name || "예약"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{format(new Date(reservation.date), 'yyyy년 M월 d일 (eee)', { locale: ko })}</p>

                {/* Details List */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <span className="font-medium">{reservation.start_time.slice(0, 5)} - {reservation.end_time.slice(0, 5)}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${reservation.courts?.name === 'pink' ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {reservation.courts?.name} 코트
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex flex-col">
                            <span>{reservation.profiles?.name || reservation.guest_name}</span>
                            <span className="text-gray-400 text-xs">{(reservation.profiles?.phone || reservation.guest_phone) || '-'}</span>
                        </div>
                    </div>

                    {reservation.purpose && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span>{reservation.purpose}</span>
                        </div>
                    )}
                </div>

                {/* Payment & Fee Management Section */}
                <div className="mb-6 pt-4 border-t border-gray-100 space-y-3">
                    {/* Adjustment Request Alert */}
                    {(reservation.payment_status === 'adjustment_requested' || reservation.adjustment_reason) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                            <div className="font-bold text-yellow-800 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> 대관비 조정 요청
                            </div>
                            <p className="text-yellow-700">{reservation.adjustment_reason || "사유 미기재"}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">최종 대관비</label>
                            <input
                                type="number"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-bold text-gray-900"
                                value={editFee}
                                onChange={(e) => setEditFee(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">입금 상태</label>
                            <select
                                className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-bold ${editPayStatus === 'paid' ? 'text-green-600' : 'text-gray-600'}`}
                                value={editPayStatus}
                                onChange={(e) => setEditPayStatus(e.target.value as any)}
                            >
                                <option value="unpaid">미납</option>
                                <option value="paid">납부 완료</option>
                                <option value="adjustment_requested">조정 요청</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    {reservation.status === 'pending' && (
                        <button
                            onClick={() => onApprove(reservation, editFee, editPayStatus)}
                            className="mr-auto px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                        >
                            승인 및 확정
                        </button>
                    )}
                    {reservation.status !== 'pending' && (
                        <button
                            onClick={() => onUpdate && onUpdate(reservation, { final_fee: editFee, payment_status: editPayStatus })}
                            className="mr-auto px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                            저장
                        </button>
                    )}
                    {reservation.status === 'confirmed' && (
                        <button
                            onClick={() => {
                                if (confirm("승인을 취소하고 대기 상태로 되돌리시겠습니까?")) {
                                    onUpdate && onUpdate(reservation, { status: 'pending' });
                                    onClose(); // Optional: close or keep open data
                                }
                            }}
                            className="bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 p-2 rounded-full transition-colors"
                            title="승인 취소"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onCopy(reservation)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        title="복사"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onEdit(reservation)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="전체 수정"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(reservation)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="삭제"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
