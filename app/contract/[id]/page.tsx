"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import ContractForm from '@/components/contract/ContractForm';
import { useRouter } from 'next/navigation';

// Next.js 15+ handles params as a Promise for async components, but for client components we can receive them.
// However, to be safe with types and versions, we can use the `use` hook or just treat it as any for now if valid,
// OR better: use `useParams` from `next/navigation` which is standard for Client Components.

import { useParams } from 'next/navigation';

export default function ContractPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reservationDetails, setReservationDetails] = useState<any>(null);
    const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            if (!id) return;

            // Auth check
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Fetch reservation details
            const { data: reservation, error } = await supabase
                .from('reservations')
                .select(`
                    *,
                    courts (
                        name
                    ),
                    profiles (
                        name,
                        phone
                    )
                `)
                .eq('id', id)
                .single();

            if (error || !reservation) {
                console.error("Error fetching reservation:", error);
                setLoading(false);
                return;
            }

            const details = {
                date: reservation.date,
                startTime: reservation.start_time,
                endTime: reservation.end_time,
                courtName: reservation.courts?.name === 'pink' ? '핑크 코트' : '민트 코트',
            };

            const userInfo = {
                name: reservation.profiles?.name || '',
                phone: reservation.profiles?.phone || '',
            };

            setReservationDetails(details);
            setCurrentUserInfo(userInfo);
            setLoading(false);
        };

        init();
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">로딩 중...</p>
            </div>
        );
    }

    if (!reservationDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">예약 정보를 찾을 수 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <ContractForm
                    reservationId={id}
                    reservationDetails={reservationDetails}
                    currentUser={currentUserInfo}
                />
            </div>
        </div>
    );
}
