"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { LoginModal } from "./LoginModal";
import { SignupModal } from "./auth/SignupModal";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";

export function Header() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

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

    const openSignup = () => {
        setIsLoginModalOpen(false);
        setIsSignupModalOpen(true);
    };

    const openLogin = () => {
        setIsSignupModalOpen(false);
        setIsLoginModalOpen(true);
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    return (
        <>
            <header className="sticky top-0 z-40 w-full bg-[#0f1117]/80 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button - Visible only on mobile */}
                        <button
                            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
                            onClick={toggleMenu}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        <Link href="/" className="font-extrabold text-xl tracking-tight">
                            <span className="text-pink-500">SPO</span><span className="text-white">ROUND</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex gap-6">
                            <Link
                                href="/"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-400",
                                    pathname === "/" ? "text-pink-500" : "text-gray-400"
                                )}
                            >
                                대관/예약
                            </Link>
                            <Link
                                href="/programs"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-400",
                                    pathname === "/programs" ? "text-pink-500" : "text-gray-400"
                                )}
                            >
                                프로그램 소개
                            </Link>
                            <Link
                                href="/info/facility"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-400",
                                    pathname === "/info/facility" ? "text-pink-500" : "text-gray-400"
                                )}
                            >
                                시설 안내
                            </Link>
                            <Link
                                href="/info/guide"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-pink-400",
                                    pathname === "/info/guide" ? "text-pink-500" : "text-gray-400"
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
                                        className="hidden md:flex items-center justify-center px-3 py-1.5 text-xs font-bold text-black bg-white rounded hover:bg-gray-200 transition-colors mr-2"
                                    >
                                        관리자 모드
                                    </Link>
                                )}
                                <Link href="/mypage" className="hidden md:flex flex-col items-end mr-2 hover:opacity-80 transition-opacity group">
                                    <span className="text-[10px] text-gray-500 group-hover:text-pink-400">마이페이지</span>
                                    <span className="text-sm font-bold text-gray-200 group-hover:text-white">
                                        {user.user_metadata.full_name || user.email?.split('@')[0] + '님'}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-all"
                                    title="로그아웃"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsLoginModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <UserIcon className="w-4 h-4" />
                                <span>로그인</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-white/5 bg-[#0f1117] absolute w-full left-0 shadow-xl backdrop-blur-md">
                        <div className="flex flex-col p-4 space-y-4">
                            <Link href="/" className="text-base font-medium text-gray-300 py-2 border-b border-white/5 hover:text-white">대관/예약</Link>
                            <Link href="/programs" className="text-base font-medium text-gray-300 py-2 border-b border-white/5 hover:text-white">프로그램 소개</Link>
                            <Link href="/info/facility" className="text-base font-medium text-gray-300 py-2 border-b border-white/5 hover:text-white">시설 안내</Link>
                            <Link href="/info/guide" className="text-base font-medium text-gray-300 py-2 border-b border-white/5 hover:text-white">이용 안내</Link>
                            {user && (
                                <Link href="/mypage" className="text-base font-medium text-gray-300 py-2 border-b border-white/5 flex items-center justify-between hover:text-white">
                                    마이페이지
                                    <span className="text-xs text-gray-500">{user.user_metadata.full_name}</span>
                                </Link>
                            )}
                            {isAdmin && (
                                <Link href="/admin" className="text-base font-bold text-pink-500 py-2">
                                    관리자 모드 접속
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSignupClick={openSignup}
            />

            <SignupModal
                isOpen={isSignupModalOpen}
                onClose={() => setIsSignupModalOpen(false)}
                onLoginClick={openLogin}
            />
        </>
    );
}
