"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, MapPin } from "lucide-react";

type SiteConfig = {
    key: string;
    value: any;
};

export default function CMSGuidePage() {
    const [config, setConfig] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch Config
    const fetchConfig = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("site_config").select("*");

        if (error) {
            console.error(error);
            alert("설정을 불러오는데 실패했습니다.");
        } else {
            const configMap: Record<string, any> = {};
            data?.forEach(item => { configMap[item.key] = item.value; });
            setConfig(configMap);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async (key: string, value: any) => {
        setSaving(true);
        const { error } = await supabase
            .from("site_config")
            .upsert({ key, value });

        if (error) {
            console.error(error);
            alert("저장 실패");
        } else {
            alert("저장되었습니다.");
            fetchConfig(); // Refresh
        }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    const rentalFees = config.rental_fees || [];
    const usageRules = config.usage_rules || { attire: [], safety: [], cleanliness: [] };
    const parkingInfo = config.parking_info || { text: "", image_url: "" };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">이용 안내 관리</h1>
                </div>

                {/* 1. Rental Fees */}
                <section className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4">대관료 안내</h2>
                    <div className="space-y-4">
                        {rentalFees.map((fee: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">구분</label>
                                    <input
                                        className="w-full border rounded p-1 text-sm"
                                        value={fee.category}
                                        onChange={e => {
                                            const newFees = [...rentalFees];
                                            newFees[idx].category = e.target.value;
                                            setConfig({ ...config, rental_fees: newFees });
                                        }}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">설명</label>
                                    <input
                                        className="w-full border rounded p-1 text-sm"
                                        value={fee.desc}
                                        onChange={e => {
                                            const newFees = [...rentalFees];
                                            newFees[idx].desc = e.target.value;
                                            setConfig({ ...config, rental_fees: newFees });
                                        }}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-pink-500">Pink 코트</label>
                                    <input
                                        className="w-full border rounded p-1 text-sm"
                                        value={fee.pink_price}
                                        onChange={e => {
                                            const newFees = [...rentalFees];
                                            newFees[idx].pink_price = e.target.value;
                                            setConfig({ ...config, rental_fees: newFees });
                                        }}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-emerald-500">Mint 코트</label>
                                    <input
                                        className="w-full border rounded p-1 text-sm"
                                        value={fee.mint_price}
                                        onChange={e => {
                                            const newFees = [...rentalFees];
                                            newFees[idx].mint_price = e.target.value;
                                            setConfig({ ...config, rental_fees: newFees });
                                        }}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">비고</label>
                                    <input
                                        className="w-full border rounded p-1 text-sm"
                                        value={fee.note}
                                        onChange={e => {
                                            const newFees = [...rentalFees];
                                            newFees[idx].note = e.target.value;
                                            setConfig({ ...config, rental_fees: newFees });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => handleSave("rental_fees", rentalFees)}
                            className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> 대관료 저장
                        </button>
                    </div>
                </section>

                {/* 2. Usage Rules */}
                <section className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4">이용 수칙</h2>

                    {['attire', 'safety', 'cleanliness'].map((category) => (
                        <div key={category} className="mb-6">
                            <h3 className="text-lg font-bold mb-2 capitalize text-gray-700">
                                {category === 'attire' ? '복장 규정' : category === 'safety' ? '안전 수칙' : '청결 규정'}
                            </h3>
                            <textarea
                                className="w-full border rounded-lg p-3 min-h-[100px] text-sm"
                                value={usageRules[category]?.join('\n') || ""}
                                onChange={e => {
                                    const newRules = { ...usageRules };
                                    newRules[category] = e.target.value.split('\n');
                                    setConfig({ ...config, usage_rules: newRules });
                                }}
                                placeholder="줄바꿈으로 항목을 구분해주세요."
                            />
                        </div>
                    ))}
                    <button
                        onClick={() => handleSave("usage_rules", usageRules)}
                        className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> 수칙 저장
                    </button>
                </section>

                {/* 3. Parking Info */}
                <section className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4">주차 안내</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">안내 문구</label>
                            <textarea
                                className="w-full border rounded-lg p-2 min-h-[80px]"
                                value={parkingInfo.text || ""}
                                onChange={e => {
                                    const newInfo = { ...parkingInfo, text: e.target.value };
                                    setConfig({ ...config, parking_info: newInfo });
                                }}
                            />
                        </div>
                        {/* Image settings placeholder */}
                        <button
                            onClick={() => handleSave("parking_info", parkingInfo)}
                            className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> 주차 정보 저장
                        </button>
                    </div>
                </section>

                {/* 4. T-Map Settings (Display Only for now) */}
                <section className="bg-white p-6 rounded-xl shadow-sm opacity-70">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> T-Map 연동 설정
                    </h2>
                    <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600">
                        <p><strong>App Key:</strong> {process.env.NEXT_PUBLIC_TMAP_APP_KEY || "설정되지 않음"}</p>
                        <p className="mt-1">※ T-Map 길찾기 기능은 이용 안내 페이지에서 자동으로 활성화됩니다.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
