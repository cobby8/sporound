"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/");
                return;
            }

            // Check profile role
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role !== "admin") {
                alert("관리자 권한이 없습니다.");
                router.push("/");
            } else {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Admin Header */}
            <header className="bg-white shadow sticky top-16 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                        <nav className="flex space-x-4">
                            <a href="/admin" className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">
                                예약 목록
                            </a>

                            <a href="/admin/users" className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">
                                회원 관리
                            </a>
                        </nav>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                        메인으로 돌아가기
                    </button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
