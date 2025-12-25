'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            // Retrieve session
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Force hard redirect to ensure clean state
                window.location.replace('/');
                return;
            }

            // Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' || session) {
                    window.location.replace('/');
                }
            });

            // Failsafe: Redirect after 3 seconds anyway if stuck (user likely logged in via other tab/header)
            setTimeout(() => {
                window.location.replace('/');
            }, 3000);

            return () => subscription.unsubscribe();
        };

        handleAuth();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">로그인 처리 중입니다...</p>
        </div>
    );
}
