'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // The Supabase client automatically handles the code exchange
        // when it detects the 'code' or 'error' parameters in the URL.
        // We just need to wait a moment or check the session, then redirect.

        const handleAuth = async () => {
            // Retrieve session (this triggers the auto-detection if needed)
            const { data: { session } } = await supabase.auth.getSession();

            // Also listen for the SIGNED_IN event which might fire after code exchange
            supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' || session) {
                    router.push('/'); // Redirect to home on success
                    router.refresh(); // Ensure server components re-run if needed
                }
            });

            // Fallback: If we already have a session, redirect immediately
            if (session) {
                router.push('/');
                router.refresh();
            }
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
