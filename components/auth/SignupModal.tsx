"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Mail, Lock, User, Phone, FileText, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPhoneNumber } from "@/lib/utils/format";

interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginClick: () => void;
}

export function SignupModal({ isOpen, onClose, onLoginClick }: SignupModalProps) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        name: "",
        phone: "",
        purpose: ""
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setForm({
                email: "",
                password: "",
                passwordConfirm: "",
                name: "",
                phone: "",
                purpose: ""
            });
            setError(null);
            setSuccess(false);
        }
    }, [isOpen]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setForm({ ...form, phone: formatted });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.passwordConfirm) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Sign Up
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.name,
                        phone: form.phone,
                        signup_purpose: form.purpose
                    }
                }
            });

            if (signUpError) throw signUpError;

            // 2. Retry Profile Update (Wait for Trigger)
            if (data.user) {
                const userId = data.user.id;
                let profileExists = false;

                // Retry up to 5 times (2.5 seconds total)
                for (let i = 0; i < 5; i++) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', userId)
                        .single();

                    if (profile) {
                        profileExists = true;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (profileExists) {
                    await supabase.from('profiles').update({
                        name: form.name,
                        phone: form.phone,
                        // Note: If signup_purpose column doesn't exist, this might error or be ignored.
                        // Ideally we should check schema or catch error, but standard update is fine.
                    }).eq('id', userId);
                }
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "회원가입 중 오류가 발생했습니다.");
        } finally {
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
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>

                                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                                    회원가입
                                </h2>

                                {success ? (
                                    <div className="text-center py-10 space-y-4">
                                        <div className="flex justify-center">
                                            <CheckCircle className="w-16 h-16 text-green-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">가입 신청 완료!</h3>
                                        <p className="text-gray-600">
                                            인증 이메일이 발송되었습니다.<br />
                                            이메일을 확인하여 가입을 완료해주세요.
                                        </p>
                                        <button
                                            onClick={() => { onClose(); onLoginClick(); }}
                                            className="mt-6 w-full h-11 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                                        >
                                            로그인하러 가기
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Email */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-600 ml-1">이메일</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="email"
                                                    required
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                                    placeholder="name@example.com"
                                                    autoComplete="username"
                                                />
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-600 ml-1">이름</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={form.name}
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                                    placeholder="홍길동"
                                                    autoComplete="name"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-600 ml-1">비밀번호</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                    <input
                                                        type="password"
                                                        required
                                                        minLength={6}
                                                        value={form.password}
                                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                                        placeholder="6자 이상"
                                                        autoComplete="new-password"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-600 ml-1">비밀번호 확인</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                    <input
                                                        type="password"
                                                        required
                                                        minLength={6}
                                                        value={form.passwordConfirm}
                                                        onChange={e => setForm({ ...form, passwordConfirm: e.target.value })}
                                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 placeholder:text-gray-500 ${form.passwordConfirm && form.password !== form.passwordConfirm
                                                            ? "border-red-500 focus:ring-red-500"
                                                            : "border-gray-300 focus:ring-pink-500"
                                                            }`}
                                                        placeholder="한 번 더 입력"
                                                        autoComplete="new-password"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-600 ml-1">연락처</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="tel"
                                                    required
                                                    value={form.phone}
                                                    onChange={handlePhoneChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                                    placeholder="010-0000-0000"
                                                    maxLength={13}
                                                />
                                            </div>
                                        </div>

                                        {/* Purpose */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-600 ml-1">가입 목적</label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                                <textarea
                                                    required
                                                    value={form.purpose}
                                                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500 min-h-[80px] resize-none"
                                                    placeholder="예: 농구 동호회 경기, 개인 연습 등"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center break-keep">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold transition-transform active:scale-[0.98] flex items-center justify-center mt-4"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "회원가입"}
                                        </button>
                                    </form>
                                )}

                                {!success && (
                                    <div className="mt-6 text-center text-sm text-gray-600">
                                        이미 계정이 있으신가요?{" "}
                                        <button
                                            onClick={onLoginClick}
                                            className="text-pink-600 font-bold hover:underline"
                                        >
                                            로그인
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
