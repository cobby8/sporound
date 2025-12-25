"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { LoginModal } from "./LoginModal";
import { LogOut, User as UserIcon } from "lucide-react";

export function Header() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        // Check initial session
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setIsAdmin(data?.role === 'admin');
        };
        checkAdmin();
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Optional: router.refresh() or redirect
        window.location.href = "/";
    };

    return (
        <>
            <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-extrabold text-xl tracking-tight">
                        <span className="text-pink-600">SPO</span>ROUND
                    </Link>

                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex gap-6">
                            <Link
                                href="/"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-600",
                                    pathname === "/" ? "text-pink-600" : "text-gray-600"
                                )}
                            >
                                대관/예약
                            </Link>
                            <Link
                                href="/programs"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-600",
                                    pathname === "/programs" ? "text-pink-600" : "text-gray-600"
                                )}
                            >
                                프로그램 소개
                            </Link>
                            <Link
                                href="/info/facility"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-600",
                                    pathname === "/info/facility" ? "text-pink-600" : "text-gray-600"
                                )}
                            >
                                시설 안내
                            </Link>
                            <Link
                                href="/info/guide"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-600",
                                    pathname === "/info/guide" ? "text-pink-600" : "text-gray-600"
                                )}
                            >
                                이용 안내
                            </Link>
                        </nav>

                        {/* Auth Buttons */}
                        {user ? (
                            <div className="flex items-center gap-3">
                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        className="hidden md:flex items-center justify-center px-3 py-1.5 text-xs font-bold text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors mr-2"
                                    >
                                        관리자 모드
                                    </Link>
                                )}
                                <Link href="/mypage" className="hidden md:flex flex-col items-end mr-2 hover:opacity-80 transition-opacity group">
                                    <span className="text-xs text-gray-400 group-hover:text-pink-500">마이페이지</span>
                                    <span className="text-sm font-bold text-gray-800 group-hover:text-pink-600">
                                        {user.user_metadata.full_name || user.email?.split('@')[0] + '님'}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="로그아웃"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsLoginModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-colors"
                            >
                                <UserIcon className="w-4 h-4" />
                                <span>로그인</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </>
    );
}
