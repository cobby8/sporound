"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Phone, FileText, Loader2 } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils/format";

export function SignupCompletionModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        purpose: ""
    });

    useEffect(() => {
        // Check session and data completeness
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const user = session.user;
            setUser(user);

            // Check if phone or purpose is missing
            // 1. Check Metadata
            const metaName = user.user_metadata?.full_name;
            const metaPhone = user.user_metadata?.phone;
            const metaPurpose = user.user_metadata?.signup_purpose;

            // 2. Check Profile (if synced)
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, phone')
                .eq('id', user.id)
                .single();

            const profileName = profile?.name;
            const profilePhone = profile?.phone;

            const hasName = !!(metaName || profileName);
            const hasPhone = !!(metaPhone || profilePhone);
            const hasPurpose = !!metaPurpose;

            if (!hasName || !hasPhone || !hasPurpose) {
                setIsOpen(true);
                // Pre-fill if partial
                setForm({
                    name: metaName || profileName || "",
                    phone: formatPhoneNumber(metaPhone || profilePhone || ""),
                    purpose: metaPurpose || ""
                });
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                checkUser();
            } else {
                setIsOpen(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            // Update User Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: form.name,
                    phone: form.phone,
                    signup_purpose: form.purpose
                }
            });

            if (updateError) throw updateError;

            // Also update Profile just in case
            await supabase
                .from('profiles')
                .update({
                    name: form.name,
                    phone: form.phone
                })
                .eq('id', user.id);

            alert("정보가 저장되었습니다.");
            setIsOpen(false);
        } catch (error: any) {
            alert("저장 실패: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-center mb-2 text-gray-900">추가 정보 입력</h2>
                    <p className="text-sm text-center text-gray-600 mb-6 break-keep">
                        원활한 서비스 이용을 위해<br />필수 정보를 입력해주세요.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 ml-1">이름 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                placeholder="홍길동"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 ml-1">연락처 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="tel"
                                    required
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                                    placeholder="010-0000-0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 ml-1">가입 목적 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <textarea
                                    required
                                    value={form.purpose}
                                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500 min-h-[80px] resize-none"
                                    placeholder="예: 체육관 대관 및 예약"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition-transform active:scale-[0.98] flex items-center justify-center mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "저장하고 시작하기"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
