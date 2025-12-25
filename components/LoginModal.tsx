"use client";

import { useState } from "react";
import { X, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Provider } from "@supabase/supabase-js";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignupClick: () => void;
}

export function LoginModal({ isOpen, onClose, onSignupClick }: LoginModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showResend, setShowResend] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowResend(false);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    setError("이메일 인증을 완료해 주세요.");
                    setShowResend(true);
                } else {
                    throw error;
                }
            } else {
                onClose(); // Close on success
            }
        } catch (err: any) {
            // Handle other specific errors if needed
            if (err.message.includes("Invalid login credentials")) {
                setError("이메일 또는 비밀번호가 올바르지 않습니다.");
            } else {
                setError(err.message || "오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            alert("인증 메일이 재발송되었습니다. 이메일을 확인해주세요.");
        } catch (err: any) {
            alert("메일 발송 실패: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: string) => {
        setLoading(true);

        let options: { redirectTo: string; scopes?: string; queryParams?: { [key: string]: string } } = {
            redirectTo: `${window.location.origin}/auth/callback`,
        };

        if (provider === 'kakao') {
            options.scopes = 'profile_nickname profile_image';
            options.queryParams = {
                scope: 'profile_nickname profile_image',
            };
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options,
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>

                                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                                    로그인
                                </h2>

                                {/* Social Login Buttons */}
                                <div className="space-y-3 mb-6">
                                    <button
                                        onClick={() => handleSocialLogin('kakao')}
                                        className="w-full h-11 bg-[#FEE500] hover:bg-[#FDD800] text-[#000000] rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 3C5.925 3 1 6.925 1 11.775c0 2.9 1.75 5.5 4.525 7.075l-1.05 3.925c-.1.35.325.625.625.4l4.475-3c.725.1 1.45.15 2.2.15 6.075 0 11-3.925 11-8.775C23 6.925 18.075 3 12 3z" />
                                        </svg>
                                        <span className="font-bold">Kakao</span>로 계속하기
                                    </button>
                                    <button
                                        onClick={() => handleSocialLogin('google')}
                                        className="w-full h-11 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                        <span className="font-bold">Google</span>로 계속하기
                                    </button>
                                </div>

                                <div className="relative mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">또는 이메일로</span>
                                    </div>
                                </div>

                                {/* Email Form */}
                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="email"
                                            placeholder="이메일"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-gray-900 placeholder:text-gray-500"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="password"
                                            placeholder="비밀번호"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-gray-900 placeholder:text-gray-500"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center break-keep flex flex-col gap-2">
                                            <span>{error}</span>
                                            {showResend && (
                                                <button
                                                    type="button"
                                                    onClick={handleResendEmail}
                                                    className="text-xs underline text-red-700 hover:text-red-900 font-bold"
                                                >
                                                    인증 메일 재발송하기
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold transition-transform active:scale-[0.98] flex items-center justify-center"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
                                    </button>
                                </form>

                                <div className="mt-6 text-center text-sm text-gray-600">
                                    계정이 없으신가요?{" "}
                                    <button
                                        onClick={onSignupClick}
                                        className="text-pink-600 font-bold hover:underline"
                                    >
                                        회원가입
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
