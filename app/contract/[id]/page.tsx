import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ContractForm from '@/components/contract/ContractForm';
import { redirect } from 'next/navigation';

export default async function ContractPage({ params }: { params: { id: string } }) {
    const supabase = createServerComponentClient({ cookies });

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const reservationId = params.id;

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
        .eq('id', reservationId)
        .single();

    if (error || !reservation) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">예약 정보를 찾을 수 없습니다.</p>
            </div>
        );
    }

    // Prepare details for the form
    const details = {
        date: reservation.date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        courtName: reservation.courts?.name === 'pink' ? '핑크 코트' : '민트 코트',
    };

    const currentUserInfo = {
        name: reservation.profiles?.name || '',
        phone: reservation.profiles?.phone || '',
    };

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <ContractForm
                    reservationId={reservationId}
                    reservationDetails={details}
                    currentUser={currentUserInfo}
                />
            </div>
        </div>
    );
}
