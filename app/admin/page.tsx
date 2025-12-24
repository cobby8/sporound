"use client";

import { useEffect, useState, useMemo } from "react";
import { getAdminReservations, updateReservationStatus } from "@/lib/services/reservation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, AlertCircle, Plus, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, X } from "lucide-react";

import { ReservationEditModal } from "@/components/admin/ReservationEditModal";
import { AdminReservationForm } from "@/components/admin/AdminReservationForm";

type Reservation = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'rejected' | 'pending' | 'canceled';
    court_id: string;
    user_id: string;
    purpose: string;
    people_count: number;
    total_price: number;
    created_at: string;
    team_name?: string;
    group_id?: string;
    recurrence_rule?: any;
    guest_name?: string;
    guest_phone?: string;
    color?: string;
    courts: { name: string };
    profiles: { name: string; phone: string; email: string };
};

type DisplayItem =
    | { type: 'single'; data: Reservation }
    | { type: 'group'; id: string; items: Reservation[]; start: string; end: string; rule: any; teamName: string; user: any };

export default function AdminPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Grouping State
    const [groupBy, setGroupBy] = useState<'none' | 'group'>('group');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const data = await getAdminReservations();
            setReservations(data || []);
        } catch (error) {
            console.error(error);
            alert("데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();

        // Realtime updates
        const channel = supabase
            .channel('admin-reservations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations' },
                () => { fetchReservations(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleStatusUpdate = async (id: string, newStatus: 'confirmed' | 'rejected') => {
        try {
            const { error } = await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
        } catch (error: any) {
            console.error(error);
            alert("처리 중 오류가 발생했습니다: " + error.message);
        }
    };

    const handleDelete = async (item: DisplayItem) => {
        if (!confirm("정말로 삭제하시겠습니까? " + (item.type === 'group' ? `\n(반복 예약 ${item.items.length}건이 모두 삭제됩니다)` : ""))) return;

        try {
            if (item.type === 'group') {
                const { error } = await supabase.from('reservations').delete().eq('group_id', item.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('reservations').delete().eq('id', item.data.id);
                if (error) throw error;
            }
            fetchReservations();
        } catch (error: any) {
            alert("삭제 실패: " + error.message);
        }
    };

    const toggleGroup = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) newExpanded.delete(groupId);
        else newExpanded.add(groupId);
        setExpandedGroups(newExpanded);
    };

    const displayItems = useMemo(() => {
        if (groupBy === 'none') {
            return reservations.map(r => ({ type: 'single', data: r } as DisplayItem));
        }

        const groups = new Map<string, Reservation[]>();
        const singles: Reservation[] = [];

        reservations.forEach(r => {
            if (r.group_id) {
                if (!groups.has(r.group_id)) groups.set(r.group_id, []);
                groups.get(r.group_id)!.push(r);
            } else {
                singles.push(r);
            }
        });

        const items: DisplayItem[] = [];

        // Add Singles
        singles.forEach(r => items.push({ type: 'single', data: r }));

        // Add Groups
        groups.forEach((groupItems, groupId) => {
            // Sort items in group
            groupItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const first = groupItems[0];
            const last = groupItems[groupItems.length - 1];

            items.push({
                type: 'group',
                id: groupId,
                items: groupItems,
                start: first.date,
                end: last.date,
                rule: first.recurrence_rule,
                teamName: first.team_name || '',
                user: first.profiles || { name: first.guest_name || '익명', phone: first.guest_phone || '' }
            });
        });

        // Sort all mainly by date desc (recent first)
        items.sort((a, b) => {
            const dateA = a.type === 'single' ? a.data.date : a.start;
            const dateB = b.type === 'single' ? b.data.date : b.start;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return items;
    }, [reservations, groupBy]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> 승인됨</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> 거절됨</span>;
            case 'canceled':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">취소됨</span>;
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> 대기중</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium text-gray-900">전체 예약 현황</h3>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            className={`px-3 py-1 text-xs font-bold rounded ${groupBy === 'group' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                            onClick={() => setGroupBy('group')}
                        >
                            그룹 보기
                        </button>
                        <button
                            className={`px-3 py-1 text-xs font-bold rounded ${groupBy === 'none' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                            onClick={() => setGroupBy('none')}
                        >
                            개별 보기
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800"
                >
                    <Plus className="w-4 h-4" />
                    예약 생성
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜/시간</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">팀/사용자</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">코트/인원</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">목적/금액</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">로딩 중...</td>
                            </tr>
                        ) : displayItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">예약 내역이 없습니다.</td>
                            </tr>
                        ) : (
                            displayItems.map((item) => {
                                if (item.type === 'single') {
                                    const res = item.data;
                                    return (
                                        <tr key={res.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(res.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="font-medium">{format(new Date(res.date), 'yyyy-MM-dd (eee)', { locale: ko })}</div>
                                                <div className="text-gray-500 text-xs">{res.start_time.slice(0, 5)} - {res.end_time.slice(0, 5)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="font-bold">{res.team_name || '-'}</div>
                                                <div className="text-xs text-gray-500">{res.profiles?.name || res.guest_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${res.courts?.name === 'pink' ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {res.courts?.name || '코트 미정'}
                                                </span>
                                                <div className="text-xs text-gray-500 mt-1">{res.people_count || 1}명</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="truncate" title={res.purpose}>{res.purpose}</div>
                                                <div className="font-medium text-gray-900">{res.total_price ? `₩${res.total_price.toLocaleString()}` : '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2 items-center">
                                                    <button onClick={() => setSelectedReservation(res)} className="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">수정</button>
                                                    <button onClick={() => handleDelete(item)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                } else {
                                    // Group Row
                                    const isExpanded = expandedGroups.has(item.id);
                                    return (
                                        <>
                                            <tr key={item.id} className="bg-blue-50/50 hover:bg-blue-50 border-l-4 border-blue-500">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 text-blue-600" />
                                                        <span className="text-xs font-bold text-blue-700">반복 예약 ({item.items.length}건)</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-bold">{item.start} ~ {item.end}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.rule?.daysOfWeek?.map((d: string) => d.toUpperCase()).join(', ')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-bold">{item.teamName || '-'}</div>
                                                    <div className="text-xs text-gray-500">{item.user?.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.items[0].courts?.name} 등
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    -
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        <button
                                                            onClick={() => setSelectedReservation(item.items[0])} // Edit group via first item
                                                            className="text-blue-600 hover:text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs"
                                                        >
                                                            전체 수정
                                                        </button>
                                                        <button onClick={() => handleDelete(item)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                                        <button onClick={() => toggleGroup(item.id)} className="text-gray-500 p-1">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && item.items.map((res) => (
                                                <tr key={res.id} className="bg-gray-50/50 hover:bg-gray-100">
                                                    <td className="px-6 py-2 pl-10 whitespace-nowrap text-xs">
                                                        {getStatusBadge(res.status)}
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap text-xs text-gray-700">
                                                        {format(new Date(res.date), 'yyyy-MM-dd (eee)', { locale: ko })} {res.start_time.slice(0, 5)}
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap text-xs text-gray-500">
                                                        {res.profiles?.name}
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap text-xs text-gray-500">
                                                        {res.courts?.name}
                                                    </td>
                                                    <td className="px-6 py-2 text-xs text-gray-500 truncate max-w-xs">
                                                        {res.purpose}
                                                    </td>
                                                    <td className="px-6 py-2 text-right">
                                                        <button
                                                            onClick={() => setSelectedReservation(res)}
                                                            className="text-gray-400 hover:text-gray-900 text-xs underline"
                                                        >
                                                            개별 수정
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    );
                                }
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Shared Edit Modal */}
            <ReservationEditModal
                reservation={selectedReservation}
                isOpen={!!selectedReservation}
                onClose={() => setSelectedReservation(null)}
                onSuccess={() => {
                    fetchReservations();
                    setSelectedReservation(null);
                }}
            />

            {/* Create Reservation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="p-4 flex justify-end">
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <AdminReservationForm
                            onSuccess={() => {
                                setIsCreateModalOpen(false);
                                fetchReservations();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
