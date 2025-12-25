"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, Check, Palette, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to generate UUID
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Interface for Initial Data (for Editing)
interface AdminReservationFormProps {
    onSuccess: () => void;
    initialData?: any; // If provided, we are in "Edit Mode"
    isCopyMode?: boolean; // If true, we are copying (pre-fill but create new)
    prefillData?: any | null; // If provided, we are creating new but filling fields (e.g. from calendar)
}

export function AdminReservationForm({ onSuccess, initialData, isCopyMode = false, prefillData }: AdminReservationFormProps) {
    const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
    const [loading, setLoading] = useState(false);
    // If editing/copying, skip user search if data exists, go straight to details? 
    const [step, setStep] = useState<"user" | "details" | "confirm">(initialData ? "details" : "user");

    const colorInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [isGuest, setIsGuest] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [courts, setCourts] = useState<any[]>([]);

    const [details, setDetails] = useState({
        courtId: "",
        daysOfWeek: ["mon"] as string[],
        startTime: "18:00",
        endTime: "20:00",
        date: new Date().toISOString().split('T')[0],
        startDate: "",
        endDate: "",
        purpose: "대관 예약",
        teamName: "",
        guestName: "",
        guestPhone: "",
        color: "#db2777"
    });

    const [previewDates, setPreviewDates] = useState<string[]>([]);
    const [conflicts, setConflicts] = useState<any[]>([]);

    // Initialize form with initialData if present
    useEffect(() => {
        if (initialData) {
            // Determine Mode
            const hasRecurrence = !!initialData.recurrence_rule || !!initialData.group_id;
            setMode(hasRecurrence ? "recurring" : "one-time");

            // Set User/Guest
            if (initialData.user_id) {
                setIsGuest(false);
                if (initialData.profiles) {
                    setSelectedUser(initialData.profiles);
                } else {
                    setSelectedUser({ id: initialData.user_id, name: initialData.profiles?.name || 'Unknown' });
                }
            } else {
                setIsGuest(true);
            }

            // Parse Recurrence Rule
            let rule = initialData.recurrence_rule;
            if (typeof rule === 'string') {
                try { rule = JSON.parse(rule); } catch (e) { }
            }

            setDetails({
                courtId: initialData.court_id,
                daysOfWeek: rule?.daysOfWeek || ["mon"],
                startTime: initialData.start_time,
                endTime: initialData.end_time,
                date: initialData.date,
                startDate: rule?.startDate || initialData.date,
                endDate: rule?.endDate || initialData.date,
                purpose: initialData.purpose || "대관 예약",
                teamName: initialData.team_name || "",
                guestName: initialData.guest_name || initialData.profiles?.name || "",
                guestPhone: initialData.guest_phone || initialData.profiles?.phone || "",
                color: initialData.color || "#db2777"
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchCourts = async () => {
            const { data } = await supabase.from('courts').select('id, name');
            if (data && data.length > 0) {
                setCourts(data);
                if (!initialData) {
                    setDetails(prev => ({ ...prev, courtId: data[0].id }));
                }
            }
        };
        fetchCourts();
    }, []); // Run once. initialData effect handles its own setDetails.

    const COLORS = [
        { label: '핑크', value: '#db2777' },
        { label: '민트', value: '#059669' },
        { label: '블루', value: '#2563eb' },
        { label: '퍼플', value: '#7c3aed' },
        { label: '그레이', value: '#4b5563' },
        { label: '레드', value: '#dc2626' },
        { label: '오렌지', value: '#ea580c' },
        { label: '옐로우', value: '#ca8a04' },
        { label: '라임', value: '#65a30d' },
        { label: '시안', value: '#0891b2' },
        { label: '인디고', value: '#4f46e5' },
        { label: '로즈', value: '#e11d48' },
    ];

    const DAYS_OPTIONS = [
        { key: "mon", label: "월" },
        { key: "tue", label: "화" },
        { key: "wed", label: "수" },
        { key: "thu", label: "목" },
        { key: "fri", label: "금" },
        { key: "sat", label: "토" },
        { key: "sun", label: "일" },
    ];

    const toggleDay = (dayKey: string) => {
        setDetails(prev => {
            const exists = prev.daysOfWeek.includes(dayKey);
            if (exists) {
                return { ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== dayKey) };
            } else {
                return { ...prev, daysOfWeek: [...prev.daysOfWeek, dayKey] };
            }
        });
    };

    const handleSearchUser = async () => {
        if (!searchQuery) return;
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('name', `%${searchQuery}%`)
            .limit(5);
        setSearchResults(data || []);
        setLoading(false);
    };

    const generateDates = () => {
        if (mode === 'one-time') {
            return details.date ? [details.date] : [];
        }
        if (!details.startDate || !details.endDate || details.daysOfWeek.length === 0) return [];

        const dates: string[] = [];

        // Use Noon to avoid timezone wrapping issues
        const s = details.startDate.split('-').map(Number);
        const e = details.endDate.split('-').map(Number);

        const current = new Date(s[0], s[1] - 1, s[2], 12, 0, 0);
        const end = new Date(e[0], e[1] - 1, e[2], 12, 0, 0);

        const dayMap: { [key: string]: number } = { "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6 };
        const targetIndices = details.daysOfWeek.map(d => dayMap[d]);

        // Safety break to prevent infinite loops
        let safety = 0;

        while (current <= end && safety < 1000) {
            safety++;
            if (targetIndices.includes(current.getDay())) {
                dates.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const handlePreview = async () => {
        if (!details.teamName) { alert("팀/단체명을 입력해주세요."); return; }
        if (mode === 'recurring' && details.daysOfWeek.length === 0) { alert("요일을 최소 하나 선택해주세요."); return; }
        if (mode === 'recurring' && (!details.startDate || !details.endDate)) { alert("시작일과 종료일을 입력해주세요."); return; }
        if (mode === 'one-time' && !details.date) { alert("날짜를 입력해주세요."); return; }

        const dates = generateDates();
        if (dates.length === 0) { alert("선택한 기간 내에 해당 요일이 없습니다."); return; }

        setPreviewDates(dates);
        setLoading(true);

        // Conflict Check
        // Exclude current ID(s) if editing? 
        // If editing group, we will be replacing them, so efficient check is just check vs database ignoring 'ids in this group'.
        // But for simplicity, we just check overlap. If overlap is with 'self' (same group_id), currently Supabase simple query can't distinguish easily without joining.
        // Hack: Client side filtering or refined query if initialData exists.

        let query = supabase
            .from('reservations')
            .select('id, date, start_time, end_time, group_id')
            .eq('court_id', details.courtId)
            .in('date', dates)
            .not('status', 'eq', 'rejected');

        const { data: bookings } = await query;

        const realConflicts: any[] = [];
        bookings?.forEach(b => {
            // If we are editing, ignore conflicts with our own group
            if (initialData?.group_id && b.group_id === initialData.group_id) return;
            if (initialData?.id && b.id === initialData.id) return; // One-time edit

            const s1 = parseInt(details.startTime.split(':')[0]);
            const e1 = parseInt(details.endTime.split(':')[0]);
            const s2 = parseInt(b.start_time.split(':')[0]);
            const e2 = parseInt(b.end_time.split(':')[0]);

            if (s1 < e2 && e1 > s2) {
                realConflicts.push(b);
            }
        });

        setConflicts(realConflicts);
        setStep("confirm");
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!isGuest && !selectedUser) return;
        setLoading(true);

        const groupId = mode === 'recurring' ? ((initialData?.group_id && !isCopyMode) ? initialData.group_id : generateUUID()) : null;
        const recurrenceRule = mode === 'recurring' ? {
            daysOfWeek: details.daysOfWeek,
            startDate: details.startDate,
            endDate: details.endDate
        } : null;

        const inserts = previewDates.map(date => ({
            court_id: details.courtId,
            user_id: isGuest ? null : selectedUser.id,
            date: date,
            start_time: details.startTime,
            end_time: details.endTime,
            purpose: details.purpose,
            people_count: 10,
            total_price: 0,
            status: 'confirmed',
            team_name: details.teamName,
            color: details.color,
            guest_name: isGuest ? details.guestName : null,
            guest_phone: isGuest ? details.guestPhone : null,
            group_id: groupId,
            recurrence_rule: recurrenceRule
        }));

        // Delete previous ONLY if editing and NOT copying
        if (initialData && !isCopyMode) {
            let deleteQuery = supabase.from('reservations').delete();

            if (initialData.group_id) {
                const { error: delError } = await deleteQuery.eq('group_id', initialData.group_id);
                if (delError) { alert("삭제 실패: " + delError.message); setLoading(false); return; }
            } else {
                const { error: delError } = await deleteQuery.eq('id', initialData.id);
                if (delError) { alert("삭제 실패: " + delError.message); setLoading(false); return; }
            }
        }

        console.log("Submitting inserts:", inserts); // Debug log

        const { data: insertData, error } = await supabase.from('reservations').insert(inserts).select();

        if (error) {
            console.error("Insert Error:", error);
            // Fallback: If error is about RLS but message is vague, tell user to run migration
            alert("예약 생성 중 오류 발생:\n" + error.message + "\n\n(Supabase SQL Editor에서 verify_fix.sql 또는 master_fix.sql을 실행했는지 확인해주세요.)");
        } else {
            console.log("Insert Success:", insertData);
            alert(`${inserts.length}건의 예약이 ${initialData ? (isCopyMode ? '생성' : '수정') : '생성'}되었습니다.`);
            onSuccess();
        }
        setLoading(false);
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                {initialData ? (isCopyMode ? "예약 복사 (새 예약 생성)" : "예약 수정") : (mode === 'one-time' ? "일일 대관 생성" : "정기 대관 생성")}
            </h3>

            {/* Mode Toggle - Always visible for flexibility */}
            {(step === "user" || step === "details") && (
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", mode === 'one-time' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
                        onClick={() => setMode("one-time")}
                    >
                        일일 대관 (1회)
                    </button>
                    <button
                        className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", mode === 'recurring' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
                        onClick={() => setMode("recurring")}
                    >
                        정기 대관 (반복)
                    </button>
                </div>
            )}

            {step === "user" && (
                <div className="space-y-6">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isGuest ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                            onClick={() => setIsGuest(false)}
                        >
                            회원 검색
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isGuest ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                            onClick={() => setIsGuest(true)}
                        >
                            비회원 / 내부용
                        </button>
                    </div>

                    {!isGuest ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="사용자 이름 검색..."
                                    className="flex-1 border p-2 rounded text-gray-900 placeholder:text-gray-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <button onClick={handleSearchUser} className="bg-gray-900 text-white px-4 rounded hover:bg-gray-800">검색</button>
                            </div>
                            {searchResults.length > 0 && (
                                <ul className="border rounded max-h-40 overflow-y-auto">
                                    {searchResults.map(u => (
                                        <li key={u.id}
                                            onClick={() => setSelectedUser(u)}
                                            className={`p-2 cursor-pointer hover:bg-gray-50 ${selectedUser?.id === u.id ? 'bg-blue-50' : ''}`}
                                        >
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                            <div className="text-xs text-gray-600">{u.email} ({u.phone})</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selectedUser && <div className="p-2 bg-blue-50 rounded text-blue-700 font-bold">선택됨: {selectedUser.name}</div>}
                        </div>
                    ) : (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">담당자 성함</label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded text-gray-900"
                                    value={details.guestName}
                                    onChange={e => setDetails({ ...details, guestName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">연락처</label>
                                <input
                                    type="tel"
                                    className="w-full border p-2 rounded text-gray-900"
                                    value={details.guestPhone}
                                    onChange={e => setDetails({ ...details, guestPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <button
                        disabled={!isGuest && !selectedUser}
                        onClick={() => setStep("details")}
                        className="w-full bg-pink-600 text-white py-2 rounded font-bold disabled:opacity-50 hover:bg-pink-700"
                    >
                        다음: 상세 정보
                    </button>
                </div>
            )}

            {step === "details" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-extrabold text-gray-900 mb-1">팀/단체명 (표시용)</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded text-gray-900"
                                placeholder="예: 스포라운드 농구팀"
                                value={details.teamName}
                                onChange={e => setDetails({ ...details, teamName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-extrabold text-gray-900 mb-1">표시 색상</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${details.color === c.value ? 'border-black scale-110 shadow-sm' : 'border-transparent'}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => setDetails({ ...details, color: c.value })}
                                        title={c.label}
                                    />
                                ))}
                                <div className="relative">
                                    <button
                                        onClick={() => colorInputRef.current?.click()}
                                        className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 border-2 border-transparent hover:scale-110 transition-transform shadow-sm flex items-center justify-center"
                                        title="커스텀 색상"
                                    >
                                        <Palette className="w-3 h-3 text-white drop-shadow-md" />
                                    </button>
                                    <input
                                        type="color"
                                        ref={colorInputRef}
                                        className="absolute opacity-0 w-0 h-0"
                                        onChange={(e) => setDetails({ ...details, color: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-extrabold text-gray-900 mb-1">코트</label>
                            <select
                                className="w-full border p-2 rounded text-gray-900"
                                value={details.courtId}
                                onChange={e => setDetails({ ...details, courtId: e.target.value })}
                            >
                                {courts.map(court => (
                                    <option key={court.id} value={court.id}>{court.name}</option>
                                ))}
                            </select>
                        </div>
                        {mode === 'recurring' ? (
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">요일 (다중 선택 가능)</label>
                                <div className="flex gap-1">
                                    {DAYS_OPTIONS.map(day => {
                                        const isSelected = details.daysOfWeek.includes(day.key);
                                        return (
                                            <button
                                                key={day.key}
                                                onClick={() => toggleDay(day.key)}
                                                className={cn(
                                                    "flex-1 py-2 text-xs font-bold rounded border transition-colors",
                                                    isSelected
                                                        ? "bg-gray-900 text-white border-gray-900"
                                                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">날짜</label>
                                <input type="date" className="w-full border p-2 rounded text-gray-900" value={details.date} onChange={e => setDetails({ ...details, date: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-extrabold text-gray-900 mb-1">시작 시간</label>
                            <input type="time" className="w-full border p-2 rounded text-gray-900" value={details.startTime} onChange={e => setDetails({ ...details, startTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-extrabold text-gray-900 mb-1">종료 시간</label>
                            <input type="time" className="w-full border p-2 rounded text-gray-900" value={details.endTime} onChange={e => setDetails({ ...details, endTime: e.target.value })} />
                        </div>
                    </div>

                    {mode === 'recurring' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">시작일</label>
                                <input type="date" className="w-full border p-2 rounded text-gray-900" value={details.startDate} onChange={e => setDetails({ ...details, startDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-gray-900 mb-1">종료일</label>
                                <input type="date" className="w-full border p-2 rounded text-gray-900" value={details.endDate} onChange={e => setDetails({ ...details, endDate: e.target.value })} />
                            </div>
                        </div>
                    )}

                    <button onClick={handlePreview} className="w-full bg-pink-600 text-white py-2 rounded font-bold hover:bg-pink-700">
                        {initialData ? (isCopyMode ? "복사 내용 확인 (충돌 체크)" : "변경 내용 확인 (충돌 체크)") : "예약 가능 확인 (충돌 체크)"}
                    </button>
                    <button onClick={() => setStep("user")} className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium">뒤로가기 (담당자/연락처 변경)</button>
                </div>
            )}

            {step === "confirm" && (
                <div className="space-y-4">
                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-900">
                        <p><strong>{initialData && !isCopyMode ? '수정' : '생성'} 예정:</strong> {previewDates.length}건</p>
                        {mode === 'recurring' ? (
                            <p><strong>기간:</strong> {previewDates[0]} ~ {previewDates[previewDates.length - 1]}</p>
                        ) : (
                            <p><strong>날짜:</strong> {details.date}</p>
                        )}
                        <p className="mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {details.startTime} - {details.endTime}</p>

                        {initialData && !isCopyMode && (
                            <div className="mt-2 text-red-600 font-bold text-xs">
                                ⚠️ 주의: 기존 예약({initialData.group_id ? '그룹 전체' : '해당 건'})은 삭제되고 위 내용으로 새로 생성됩니다.
                            </div>
                        )}
                        {initialData && isCopyMode && (
                            <div className="mt-2 text-blue-600 font-bold text-xs">
                                ℹ️ 기존 예약 정보를 바탕으로 새로운 예약을 생성합니다. (기존 예약 유지됨)
                            </div>
                        )}
                    </div>

                    {conflicts.length > 0 ? (
                        <div className="bg-red-50 p-3 rounded text-sm text-red-600">
                            <strong>⚠️ 충돌 발생 ({conflicts.length}건)</strong>
                            <ul className="pl-4 list-disc mt-1">
                                {conflicts.slice(0, 3).map((c, i) => (
                                    <li key={i}>{c.date} {c.start_time}~{c.end_time}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-green-600 text-sm font-bold flex items-center gap-2">✅ 충돌 없음</div>
                    )}

                    <button
                        disabled={conflicts.length > 0}
                        onClick={handleSubmit}
                        className="w-full bg-gray-900 text-white py-2 rounded font-bold disabled:opacity-50 hover:bg-gray-800"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : (initialData && !isCopyMode ? "예약 수정 완료" : "예약 생성 완료")}
                    </button>
                    <button onClick={() => setStep("details")} className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium">뒤로가기</button>
                </div>
            )}
        </div>
    );
}
