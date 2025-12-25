"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { getAdminReservations, updateReservationStatus, ReservationDB } from "@/lib/services/reservation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, AlertCircle, Plus, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, X, Copy, List, Calendar as CalendarIcon, AlertTriangle, Edit2 } from "lucide-react";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { AdminReservationForm } from "@/components/admin/AdminReservationForm";
import { AdminReservationEditModal } from "@/components/admin/AdminReservationEditModal";
import { CalendarDetailPopover } from "@/components/admin/CalendarDetailPopover";


import { generateScheduleData } from "@/lib/data";

type Reservation = ReservationDB; // Alias for local use

type DisplayItem =
    | { type: 'single', data: Reservation }
    | { type: 'group', id: string, items: Reservation[], start: string, end: string, rule: any, teamName: string, user: any };

export default function AdminPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Calendar Popover State
    const [popoverData, setPopoverData] = useState<{
        isOpen: boolean;
        reservation: Reservation | null;
        position: { x: number; y: number } | null;
    }>({ isOpen: false, reservation: null, position: null });

    // Delete Confirmation State
    const [deleteTarget, setDeleteTarget] = useState<DisplayItem | null>(null);
    const [deleteScope, setDeleteScope] = useState<'this' | 'following' | 'all'>('this');


    // Grouping State
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [copyData, setCopyData] = useState<any>(null);
    const [createPrefill, setCreatePrefill] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRecovering, setIsRecovering] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'canceled'>('all');
    const [filterCourt, setFilterCourt] = useState<'all' | 'pink' | 'mint'>('all');
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

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

    const handleUpdateReservation = async (id: string, updates: any) => {
        try {
            const { error } = await supabase.from('reservations').update(updates).eq('id', id);
            if (error) throw error;
            fetchReservations(); // Refresh
        } catch (error: any) {
            console.error(error);
            alert("처리 중 오류가 발생했습니다: " + error.message);
        }
    };

    // Actual Delete Logic (Triggered by Modal)
    const executeDelete = async () => {
        if (!deleteTarget) return;

        const item = deleteTarget;
        const isGroup = item.type === 'group';
        const isRecurringInstance = item.type === 'single' && !!item.data.group_id;

        try {
            if (isGroup) {
                // Group Header: Delete All
                const { error } = await supabase.from('reservations').delete().eq('group_id', item.id);
                if (error) throw error;
            } else if (isRecurringInstance) {
                // Recurring Instance: Use Scope
                if (deleteScope === 'this') {
                    const { error } = await supabase.from('reservations').delete().eq('id', item.data.id);
                    if (error) throw error;
                } else if (deleteScope === 'following') {
                    const { error } = await supabase.from('reservations').delete()
                        .eq('group_id', item.data.group_id)
                        .gte('date', item.data.date);
                    if (error) throw error;
                } else {
                    // All
                    const { error } = await supabase.from('reservations').delete().eq('group_id', item.data.group_id!);
                    if (error) throw error;
                }
            } else {
                // Single Standalone
                const { error } = await supabase.from('reservations').delete().eq('id', item.data.id);
                if (error) throw error;
            }

            // Close popover if open
            setPopoverData({ isOpen: false, reservation: null, position: null });

            // Close Modal
            setDeleteTarget(null);

            alert("삭제되었습니다.");
            fetchReservations();
        } catch (error: any) {
            console.error("Delete failed:", error);
            alert("삭제 실패: " + error.message);
        }
    };

    // Trigger Delete Modal
    const handleDelete = (item: DisplayItem) => {
        setDeleteScope('this'); // Reset scope
        setDeleteTarget(item);
    };

    const handleCopy = (res: Reservation) => {
        const dataToCopy = { ...res };
        // Clean up data for copy (new reservation)
        delete (dataToCopy as any).id;
        delete (dataToCopy as any).created_at;
        delete (dataToCopy as any).group_id; // Clean group logic
        delete (dataToCopy as any).recurrence_rule; // Clean recurrence logic

        setCopyData(dataToCopy);
        setIsCreateModalOpen(true);
    };

    const handleCalendarReserve = (data: { startTime: string, endTime: string, date: string, court: string }) => {
        setCopyData(null);
        setCreatePrefill({
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            courtName: data.court
        });
        setIsCreateModalOpen(true);
    };

    const toggleGroup = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) newExpanded.delete(groupId);
        else newExpanded.add(groupId);
        setExpandedGroups(newExpanded);
    };

    const displayItems = useMemo(() => {
        // Filter based on Search Term
        // Filter based on Search Term & Filters
        const filteredReservations = reservations.filter(r => {
            // Text Search
            const lowerTerm = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || (
                r.team_name?.toLowerCase().includes(lowerTerm) ||
                r.profiles?.name?.toLowerCase().includes(lowerTerm) ||
                r.profiles?.phone?.includes(searchTerm) ||
                r.guest_name?.toLowerCase().includes(lowerTerm) ||
                r.purpose?.toLowerCase().includes(lowerTerm)
            );

            // Status Filter
            const matchesStatus = filterStatus === 'all' || r.status === filterStatus;

            // Court Filter
            const matchesCourt = filterCourt === 'all' || r.courts?.name === filterCourt;

            // Date Filter
            let matchesDate = true;
            if (filterStartDate) matchesDate = matchesDate && r.date >= filterStartDate;
            if (filterEndDate) matchesDate = matchesDate && r.date <= filterEndDate;

            return matchesSearch && matchesStatus && matchesCourt && matchesDate;
        });

        if (groupBy === 'none') {
            return filteredReservations.map(r => ({ type: 'single', data: r } as DisplayItem));
        }

        const groups = new Map<string, Reservation[]>();
        const singles: Reservation[] = [];

        filteredReservations.forEach(r => {
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

            // Try to parse rule if it's a string, or use if object
            let rule = first.recurrence_rule;
            if (typeof rule === 'string') {
                try { rule = JSON.parse(rule); } catch (e) { }
            }

            // Use Rule's start/end date if available (Source of Truth), otherwise fallback to first/last item date
            const groupStart = rule?.startDate || first.date;
            const groupEnd = rule?.endDate || last.date;

            items.push({
                type: 'group',
                id: groupId,
                items: groupItems,
                start: groupStart,
                end: groupEnd,
                rule: rule,
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
        return items;
    }, [reservations, groupBy, searchTerm, filterStatus, filterCourt, filterStartDate, filterEndDate]);

    // Calendar Data Generation Use String Comparison
    const weeklySchedule = useMemo(() => {
        if (viewMode !== 'calendar') return [];

        // 1. Calculate Monday
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff); // Monday

        // Format range as strings "YYYY-MM-DD"
        const startStr = format(start, 'yyyy-MM-dd');

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sunday
        const endStr = format(end, 'yyyy-MM-dd');

        // 2. Filter reservations using String Comparison
        const weeklyReservations = reservations.filter(r => {
            // r.date is "YYYY-MM-DD" string
            return r.date >= startStr && r.date <= endStr;
        });

        // 3. Generate schedule
        return generateScheduleData(weeklyReservations);
    }, [reservations, currentDate, viewMode]);

    const getWeekStartDate = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return format(start, 'yyyy-MM-dd');
    };

    const getNewStatusBadge = (res: Reservation) => {
        const now = new Date();
        const resDate = new Date(`${res.date}T${res.start_time}`);
        const resEnd = new Date(`${res.date}T${res.end_time}`);

        const badges = [];

        // 1. Regular Badge
        if (res.recurrence_rule) {
            badges.push(
                <span key="regular" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 mr-1">
                    정기대관
                </span>
            );
        }

        // 2. Status Badge
        if (res.status === 'pending') {
            badges.push(
                <span key="pending" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
                    승인요청
                </span>
            );
        } else if (res.status === 'confirmed') {
            if (resEnd < now) {
                // Past - Empty (as requested: "Used -> Empty")
            } else if (resDate > now) {
                badges.push(
                    <span key="before_use" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                        사용전
                    </span>
                );
            } else {
                // Currently In Use
                badges.push(
                    <span key="in_use" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                        사용중
                    </span>
                );
            }
        } else if (res.status === 'canceled') {
            badges.push(<span key="canceled" className="text-xs text-gray-500 font-bold">취소됨</span>);
        } else if (res.status === 'rejected') {
            badges.push(<span key="rejected" className="text-xs text-red-500 font-bold">거절됨</span>);
        }

        return <div className="flex flex-wrap gap-1">{badges}</div>;
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-medium text-gray-900">전체 예약 현황</h3>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-3 h-3" /> 리스트
                            </button>
                            <button
                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${viewMode === 'calendar' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                                onClick={() => setViewMode('calendar')}
                            >
                                <CalendarIcon className="w-3 h-3" /> 캘린더
                            </button>
                        </div>
                        {viewMode === 'list' && (
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    className={`px-3 py-1 text-xs font-bold rounded ${groupBy === 'group' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                                    onClick={() => setGroupBy('group')}
                                >
                                    그룹
                                </button>
                                <button
                                    className={`px-3 py-1 text-xs font-bold rounded ${groupBy === 'none' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                                    onClick={() => setGroupBy('none')}
                                >
                                    개별
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="이름, 팀명, 전화번호 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-500 text-black h-10"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">상태</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="h-10 pl-3 pr-8 text-sm border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black text-gray-900 font-bold min-w-[100px]"
                        >
                            <option value="all" className="text-gray-500">전체</option>
                            <option value="pending" className="text-black">대기중</option>
                            <option value="confirmed" className="text-black">승인됨</option>
                            <option value="canceled" className="text-black">취소됨</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">코트</span>
                        <select
                            value={filterCourt}
                            onChange={(e) => setFilterCourt(e.target.value as any)}
                            className="h-10 pl-3 pr-8 text-sm border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black text-gray-900 font-bold min-w-[100px]"
                        >
                            <option value="all" className="text-gray-500">전체</option>
                            <option value="pink" className="text-black">Pink</option>
                            <option value="mint" className="text-black">Mint</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">기간</span>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className={`h-10 px-3 text-sm border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black font-bold ${filterStartDate ? 'text-gray-900' : 'text-gray-400'}`}
                        />
                        <span className="text-gray-400 font-bold">~</span>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className={`h-10 px-3 text-sm border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black font-bold ${filterEndDate ? 'text-gray-900' : 'text-gray-400'}`}
                        />
                    </div>
                    {(filterStatus !== 'all' || filterCourt !== 'all' || filterStartDate || filterEndDate) && (
                        <button
                            onClick={() => {
                                setFilterStatus('all');
                                setFilterCourt('all');
                                setFilterStartDate('');
                                setFilterEndDate('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded hover:bg-red-50"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'calendar' && (
                        <div className="flex items-center gap-2 mr-4 bg-white border border-gray-300 p-1 rounded-lg h-10 px-2 shadow-sm">
                            <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="p-1 hover:bg-gray-100 rounded text-black"><ChevronDown className="w-5 h-5 rotate-90" /></button>
                            <span className="text-sm font-bold min-w-[100px] text-center text-black leading-none pt-0.5">{getWeekStartDate()}</span>
                            <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="p-1 hover:bg-gray-100 rounded text-black"><ChevronDown className="w-5 h-5 -rotate-90" /></button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setCopyData(null);
                            setCreatePrefill(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 whitespace-nowrap h-10 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        예약 생성
                    </button>
                </div>
            </div>

            {
                viewMode === 'list' ? (
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
                                                    <td className="px-6 py-4 whitespace-nowrap">{getNewStatusBadge(res)}</td>
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
                                                        <div className="truncate" title={res.purpose || ""}>{res.purpose}</div>
                                                        <div className="font-medium text-gray-900">
                                                            {res.final_fee ? (
                                                                <span className="text-pink-600 font-bold">₩{res.final_fee.toLocaleString()}</span>
                                                            ) : (
                                                                res.total_price ? `₩${res.total_price.toLocaleString()}` : '-'
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2 items-center">
                                                            {res.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleUpdateReservation(res.id, { status: 'confirmed' })}
                                                                    className="text-green-600 hover:bg-green-50 bg-white border border-green-200 px-2 py-1 rounded text-xs font-bold shadow-sm"
                                                                >
                                                                    승인
                                                                </button>
                                                            )}
                                                            {res.status === 'confirmed' && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm("승인을 취소하고 대기 상태로 되돌리시겠습니까?")) {
                                                                            handleUpdateReservation(res.id, { status: 'pending' });
                                                                        }
                                                                    }}
                                                                    className="text-orange-600 hover:bg-orange-50 bg-white border border-orange-200 px-2 py-1 rounded text-xs font-bold shadow-sm"
                                                                >
                                                                    승인취소
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleCopy(res)} className="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs flex items-center gap-1"><Copy className="w-3 h-3" /> 복사</button>
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
                                                <Fragment key={item.id}>
                                                    <tr className="bg-blue-50/50 hover:bg-blue-50 border-l-4 border-blue-500">
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
                                                                {/* Group can also be copied? Maybe copy first item logic */}
                                                                <button onClick={() => handleCopy(item.items[0])} className="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs flex items-center gap-1"><Copy className="w-3 h-3" /> 복사</button>
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
                                                                {getNewStatusBadge(res)}
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
                                                                <div className="flex justify-end gap-1">
                                                                    <button onClick={() => handleCopy(res)} className="text-gray-400 hover:text-gray-900 text-xs mr-2"><Copy className="w-3 h-3 inline" /></button>
                                                                    <button
                                                                        onClick={() => setSelectedReservation(res)}
                                                                        className="text-gray-400 hover:text-gray-900 text-xs underline"
                                                                    >
                                                                        개별 수정
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            );
                                        }
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 min-h-[500px]">
                        <ScheduleBoard
                            schedule={weeklySchedule}
                            startDate={getWeekStartDate()}
                            onOccupiedCellClick={(id: string, e?: React.MouseEvent) => {
                                const res = reservations.find(r => r.id === id);
                                if (res && e) {
                                    setPopoverData({
                                        isOpen: true,
                                        reservation: res,
                                        position: { x: e.clientX, y: e.clientY }
                                    });
                                }
                            }}
                            onReserve={handleCalendarReserve}
                        />
                    </div>
                )
            }

            {/* Popover */}
            {
                popoverData.isOpen && (
                    <CalendarDetailPopover
                        reservation={popoverData.reservation}
                        position={popoverData.position}
                        onClose={() => setPopoverData(prev => ({ ...prev, isOpen: false }))}
                        onEdit={(res) => {
                            setPopoverData(prev => ({ ...prev, isOpen: false }));
                            setSelectedReservation(res);
                        }}
                        onCopy={(res) => {
                            setPopoverData(prev => ({ ...prev, isOpen: false }));
                            handleCopy(res);
                        }}
                        onDelete={(res) => {
                            handleDelete({ type: 'single', data: res });
                        }}
                        onApprove={(res, fee, paymentStatus) => {
                            setPopoverData(prev => ({ ...prev, isOpen: false }));
                            handleUpdateReservation(res.id, {
                                status: 'confirmed',
                                final_fee: fee,
                                payment_status: paymentStatus
                            });
                        }}
                        onUpdate={(res, updates) => {
                            handleUpdateReservation(res.id, updates);
                        }}
                    />
                )
            }

            {/* Shared Edit Modal */}
            <AdminReservationEditModal
                reservation={selectedReservation}
                isOpen={!!selectedReservation}
                onClose={() => setSelectedReservation(null)}
                onUpdate={() => {
                    fetchReservations();
                    setSelectedReservation(null);
                }}
            />

            {/* Create Reservation Modal */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="p-4 flex justify-end">
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <AdminReservationForm
                                initialData={copyData}
                                isCopyMode={!!copyData}
                                prefillData={createPrefill}
                                onSuccess={() => {
                                    setIsCreateModalOpen(false);
                                    setCopyData(null);
                                    setCreatePrefill(null);
                                    fetchReservations();
                                }}
                            />
                        </div>
                    </div>
                )
            }
            {/* Simple Delete Confirmation Modal */}
            {/* Simple Delete Confirmation Modal */}
            {
                deleteTarget && (() => {
                    const target = deleteTarget;
                    return (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                                <div className="flex items-center gap-2 text-red-600 mb-4">
                                    <AlertTriangle className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">삭제 확인</h3>
                                </div>

                                {target.type === 'single' && target.data.group_id ? (
                                    <div className="mb-6">
                                        <p className="text-gray-600 mb-3 font-medium">
                                            반복되는 예약입니다. 삭제 범위를 선택해주세요.
                                        </p>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deleteScope"
                                                    value="this"
                                                    checked={deleteScope === 'this'}
                                                    onChange={() => setDeleteScope('this')}
                                                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                />
                                                <span className="text-sm text-gray-700">이 일정만 삭제</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deleteScope"
                                                    value="following"
                                                    checked={deleteScope === 'following'}
                                                    onChange={() => setDeleteScope('following')}
                                                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-700">이 이후 일정 모두 삭제</span>
                                                    <span className="text-xs text-gray-400">선택한 일정을 포함하여 이후의 모든 반복 예약이 삭제됩니다.</span>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deleteScope"
                                                    value="all"
                                                    checked={deleteScope === 'all'}
                                                    onChange={() => setDeleteScope('all')}
                                                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                />
                                                <span className="text-sm text-gray-700">전체 일정 삭제</span>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 mb-6 whitespace-pre-wrap">
                                        {target.type === 'group'
                                            ? `[반복 예약 전체 삭제]\n총 ${target.items.length}건의 예약이 영구적으로 삭제됩니다.`
                                            : `해당 예약을 정말 삭제하시겠습니까?`}
                                    </p>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={executeDelete}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors"
                                    >
                                        삭제하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
        </div>
    );
}
