"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, Shield, ArrowRight, User, Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserDetailModal } from "@/components/admin/UserDetailModal";

export default function UserManagementPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchUsers = async () => {
        setLoading(true);
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) console.error(error);
        else setUsers(data || []);

        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers();
    };

    const handleWithdraw = async (user: any) => {
        const confirmMsg = `[주의] ${user.name || user.email} 님을 강제 탈퇴시키시겠습니까?\n\n탈퇴 시 해당 회원의 모든 정보와 예약 내역이 영구적으로 삭제될 수 있습니다.`;
        if (!confirm(confirmMsg)) return;

        // Note: This only deletes from 'public.profiles'. 
        // If there is a cascading delete on 'auth.users', fine. 
        // Otherwise, they lose profile but auth account remains (but effectively broken).
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (error) {
            alert("탈퇴 처리 실패: " + error.message);
        } else {
            alert("정상적으로 탈퇴 처리되었습니다.");
            fetchUsers();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">회원 관리</h2>

                <button
                    onClick={() => router.push('/admin/users/admins')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                    <Shield className="w-4 h-4" />
                    관리자 권한 관리
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="이름, 이메일, 전화번호 검색..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800">
                    검색
                </button>
            </form>

            {/* List */}
            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                ) : users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name || "미등록"}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{user.phone || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.role === 'admin' ? '관리자' : '일반회원'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded flex items-center gap-1 text-xs transition-colors border border-gray-200"
                                                >
                                                    <Eye className="w-3 h-3" /> 상세
                                                </button>
                                                {user.role !== 'admin' && ( // Don't allow deleting admins here easily
                                                    <button
                                                        onClick={() => handleWithdraw(user)}
                                                        className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center gap-1 text-xs transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> 탈퇴
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <UserDetailModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={selectedUser}
            />
        </div>
    );
}
