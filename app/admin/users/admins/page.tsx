"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, Shield, ShieldAlert, User, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminAdminsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<any[]>([]);
    const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);

    // Fetch ONLY admins
    const fetchAdmins = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin') // Only admins
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setAdmins(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    // Fetch potential admins (non-admin users)
    const fetchNonAdmins = async (query: string = "") => {
        setSearchLoading(true);
        let builder = supabase
            .from('profiles')
            .select('*')
            .neq('role', 'admin') // Exclude existing admins
            .order('created_at', { ascending: false })
            .limit(20);

        if (query) {
            builder = builder.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
        }

        const { data, error } = await builder;

        if (error) {
            console.error(error);
            alert("회원 목록을 불러오는 중 오류가 발생했습니다.");
        } else {
            setSearchedUsers(data || []);
        }
        setSearchLoading(false);
    };

    useEffect(() => {
        fetchAdmins();
        fetchNonAdmins(); // Fetch default list on mount
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchNonAdmins(searchQuery);
    };

    const handleGrantAdmin = async (user: any) => {
        if (!confirm(`[관리자 승격]\n\n${user.name}(${user.email}) 님에게 관리자 권한을 부여하시겠습니까?`)) return;

        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (error) {
            alert("처리 실패: " + error.message);
        } else {
            alert("관리자로 승격되었습니다.");
            setSearchedUsers(searchedUsers.filter(u => u.id !== user.id));
            fetchAdmins();
        }
    };

    const handleRevokeAdmin = async (admin: any) => {
        if (!confirm(`[권한 해제]\n\n${admin.name}(${admin.email}) 님의 관리자 권한을 해제하시겠습니까?`)) return;

        const { error } = await supabase
            .from('profiles')
            .update({ role: 'user' }) // Reset to user
            .eq('id', admin.id);

        if (error) {
            alert("처리 실패: " + error.message);
        } else {
            alert("권한이 해제되었습니다.");
            fetchAdmins();
            fetchNonAdmins(searchQuery); // Refresh list
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900">관리자 권한 관리</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Current Admins */}
                <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 bg-purple-50 flex items-center justify-between">
                        <h3 className="font-bold text-purple-900 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            현재 관리자 목록
                        </h3>
                        <span className="bg-purple-200 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                            {admins.length}명
                        </span>
                    </div>
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
                    ) : admins.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">관리자가 없습니다.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {admins.map(admin => (
                                <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{admin.name || "미등록"}</div>
                                            <div className="text-xs text-gray-500">{admin.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRevokeAdmin(admin)}
                                        className="text-gray-400 hover:text-red-600 text-xs border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        권한 해제
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Grant New */}
                <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Search className="w-5 h-5 text-gray-500" />
                            새로운 관리자 추가
                        </h3>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="이름, 이메일 검색..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={searchLoading}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
                            >
                                {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "검색"}
                            </button>
                        </form>

                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                {searchQuery ? "검색 결과" : "회원 목록"}
                            </h4>
                            {searchedUsers.map(user => (
                                <div key={user.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between hover:border-purple-300 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-900">{user.name || "미등록"}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleGrantAdmin(user)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-md font-bold transition-colors shadow-sm"
                                    >
                                        승격
                                    </button>
                                </div>
                            ))}
                            {!searchLoading && searchQuery && searchedUsers.length === 0 && (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    검색된 회원이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
