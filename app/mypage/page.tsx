"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, Calendar, Clock, MapPin, User, LogOut } from "lucide-react";

type Reservation = any;
type Profile = {
    email: string;
    name: string;
    phone: string;
    role: string;
    signup_purpose?: string;
};

export default function MyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/");
                return;
            }

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            // Merge with user_metadata if profile is incomplete
            // This handles cases where trigger didn't copy all fields or column doesn't exist
            const mergedProfile = {
                ...profileData,
                phone: profileData?.phone || user.user_metadata?.phone,
                signup_purpose: profileData?.signup_purpose || user.user_metadata?.signup_purpose,
                name: profileData?.name || user.user_metadata?.full_name
            };

            setProfile(mergedProfile);

            // 2. Fetch My Reservations
            const { data: reservationData } = await supabase
                .from("reservations")
                .select(`
                    *,
                    courts ( name )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            setReservations(reservationData || []);
            setLoading(false);
        };

        fetchData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">승인됨</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">거절됨</span>;
            case 'canceled':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">취소됨</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">대기중</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">마이 페이지</h1>
                        <p className="text-gray-500 mt-1">내 정보와 예약 내역을 확인하세요.</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                        메인으로
                    </button>
                </div>

                {/* Profile Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-pink-500" />
                            내 정보
                        </h2>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"
                        >
                            <LogOut className="w-4 h-4" /> 로그아웃
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-500">이름</label>
                            <div className="mt-1 text-lg font-semibold">{profile?.name || '정보 없음'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">이메일</label>
                            <div className="mt-1 text-lg text-gray-900">{profile?.email}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">연락처</label>
                            <div className="mt-1 text-lg text-gray-900">{profile?.phone || '-'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">회원 등급</label>
                            <div className="mt-1">
                                {profile?.role === 'admin' ?
                                    <span className="text-pink-600 font-bold">관리자</span> :
                                    <span className="text-gray-600">일반 회원</span>
                                }
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500">가입 목적</label>
                            <div className="mt-1 text-lg text-gray-900 bg-gray-50 p-3 rounded-lg">
                                {profile?.signup_purpose || '입력된 가입 목적이 없습니다.'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reservations Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-pink-500" />
                        예약 내역
                    </h2>

                    {reservations.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <p className="text-gray-500">예약 내역이 없습니다.</p>
                            <button
                                onClick={() => router.push('/')}
                                className="mt-4 text-pink-600 font-medium hover:underline"
                            >
                                예약하러 가기
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reservations.map((res) => (
                                <div key={res.id} className="border border-gray-100 rounded-xl p-5 hover:border-pink-200 transition-colors bg-white">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(res.status)}
                                                <span className="text-sm text-gray-400">{format(new Date(res.created_at), 'yyyy-MM-dd')} 신청</span>
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {format(new Date(res.date), 'yyyy년 MM월 dd일 (eee)', { locale: ko })}
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-600 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {res.start_time.slice(0, 5)} - {res.end_time.slice(0, 5)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {res.courts.name === 'pink' ? '핑크 코트' : '민트 코트'}
                                                </div>
                                            </div>
                                            {res.total_price > 0 && (
                                                <div className="text-sm font-medium text-gray-900">
                                                    결제 예정 금액: {res.total_price.toLocaleString()}원
                                                </div>
                                            )}
                                        </div>
                                        {/* Future: Add Payment / Cancel buttons here */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
