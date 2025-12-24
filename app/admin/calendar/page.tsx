"use client";

import { useState } from "react";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminReservationForm } from "@/components/admin/AdminReservationForm";
import { Plus } from "lucide-react";

export default function AdminCalendarPage() {
    const [showRecurring, setShowRecurring] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">주간 일정 관리</h2>
                <button
                    onClick={() => setShowRecurring(!showRecurring)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800"
                >
                    <Plus className="w-4 h-4" />
                    예약 생성
                </button>
            </div>

            {showRecurring && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                    <AdminReservationForm onSuccess={() => setShowRecurring(false)} />
                </div>
            )}

            <AdminCalendar />
        </div>
    );
}
