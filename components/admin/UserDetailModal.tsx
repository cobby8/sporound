import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Calendar, User, Phone, Mail, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any; // User Profile Data
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchUserReservations();
        }
    }, [isOpen, user]);

    const fetchUserReservations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                *,
                courts ( name )
            `)
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(10); // Recent 10 items

        if (error) console.error(error);
        else setReservations(data || []);
        setLoading(false);
    };

    if (!isOpen || !user) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 승인됨</span>;
            case 'rejected': return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> 거절됨</span>;
            case 'canceled': return <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-xs">취소됨</span>;
            case 'pending': return <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> 대기중</span>;
            default: return <span className="text-gray-500 text-xs">{status}</span>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" />
                        회원 상세 정보
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {/* User Profile Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">이름</label>
                                <div className="text-lg font-medium text-gray-900">{user.name || "미등록"}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">이메일</label>
                                <div className="text-base text-gray-700 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">연락처</label>
                                <div className="text-base text-gray-700 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {user.phone || "-"}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">가입일</label>
                                <div className="text-base text-gray-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {new Date(user.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 my-6"></div>

                    {/* Reservation History */}
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        최근 예약 내역
                    </h4>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">불러오는 중...</div>
                    ) : reservations.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500 text-sm">
                            예약 내역이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">날짜</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">시간</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">코트</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reservations.map((res) => (
                                        <tr key={res.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-900">
                                                {format(new Date(res.date), 'yyyy-MM-dd (eee)', { locale: ko })}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                {res.start_time.slice(0, 5)} - {res.end_time.slice(0, 5)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                {res.courts?.name}
                                            </td>
                                            <td className="px-4 py-2">
                                                {getStatusBadge(res.status)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm("정말 이 예약을 삭제하시겠습니까?")) return;
                                                        const { error } = await supabase.from('reservations').delete().eq('id', res.id);
                                                        if (error) alert("삭제 실패: " + error.message);
                                                        else {
                                                            alert("삭제되었습니다.");
                                                            fetchUserReservations();
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"
                                                    title="예약 삭제"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
