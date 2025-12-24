"use client";

import { X } from "lucide-react";
import { AdminReservationForm } from "./AdminReservationForm";

interface Props {
    reservation: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ReservationEditModal({ reservation, isOpen, onClose, onSuccess }: Props) {
    if (!isOpen || !reservation) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        예약 수정
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4">
                    <AdminReservationForm
                        initialData={reservation}
                        onSuccess={() => {
                            onSuccess();
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
