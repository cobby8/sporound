"use client";

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface ContractFormProps {
    reservationId: string;
    reservationDetails: {
        date: string;
        startTime: string;
        endTime: string;
        courtName: string;
    };
    currentUser?: {
        name: string;
        phone: string;
    } | null;
}

export default function ContractForm({ reservationId, reservationDetails, currentUser }: ContractFormProps) {
    const [lesseeName, setLesseeName] = useState(currentUser?.name || '');
    const [lesseePhone, setLesseePhone] = useState(currentUser?.phone || '');
    const [loading, setLoading] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);
    const router = useRouter();
    // const supabase = createClient(); // REMOVED


    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (sigCanvas.current?.isEmpty()) {
            alert('서명을 해주세요.');
            return;
        }

        const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
        setLoading(true);

        try {
            const { error } = await supabase
                .from('contracts')
                .insert({
                    reservation_id: reservationId,
                    lessee_name: lesseeName,
                    lessee_phone: lesseePhone,
                    signature_data: signatureData,
                    signed_at: new Date().toISOString(),
                });

            if (error) throw error;

            alert('전자 계약서가 작성되었습니다.');
            router.push('/mypage'); // Or wherever appropriate
        } catch (error) {
            console.error('Error submitting contract:', error);
            alert('계약서 작성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold leading-6 text-gray-900 mb-6">
                시설 대관 전자 계약서
            </h3>

            <div className="mb-6 bg-gray-50 p-4 rounded-md text-sm text-gray-700">
                <p><span className="font-bold">대관 일자:</span> {reservationDetails.date}</p>
                <p><span className="font-bold">대관 시간:</span> {reservationDetails.startTime} ~ {reservationDetails.endTime}</p>
                <p><span className="font-bold">사용 시설:</span> {reservationDetails.courtName}</p>
                <p className="mt-2 text-xs text-gray-500">
                    위 시설 사용에 대하여 아래와 같이 계약을 체결합니다.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        임차인 성명
                    </label>
                    <input
                        type="text"
                        id="name"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                        value={lesseeName}
                        onChange={(e) => setLesseeName(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        연락처
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                        value={lesseePhone}
                        onChange={(e) => setLesseePhone(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        서명
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                width: 500,
                                height: 200,
                                className: 'sigCanvas w-full h-48 bg-gray-50'
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={clearSignature}
                        className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        서명 지우기
                    </button>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? '제출 중...' : '계약서 작성 완료'}
                    </button>
                </div>
            </form>
        </div>
    );
}
