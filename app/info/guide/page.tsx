import { supabase } from "@/lib/supabase";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
    const { data: configData } = await supabase.from("site_config").select("*");
    const config: Record<string, any> = {};
    configData?.forEach((item) => {
        config[item.key] = item.value;
    });

    const rentalFees = config.rental_fees || [];
    const usageRules = config.usage_rules || {
        attire: [],
        safety: [],
        cleanliness: [],
    };
    const parkingInfo = config.parking_info || { text: "", image_url: "" };

    return (
        <div className="bg-white min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
                        이용 안내
                    </h2>
                    <p className="mt-4 text-xl text-gray-600">
                        대관료 및 상세 이용 수칙을 확인하세요.
                    </p>
                </div>

                {/* Pricing Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-12 border border-gray-200">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-bold text-black">
                            대관료 안내
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-center">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        구분
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        내용
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-pink-600 uppercase tracking-wider bg-pink-50">
                                        핑크 코트 (시간당)
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50">
                                        민트 코트 (시간당)
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        비고
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rentalFees.length > 0 ? (
                                    rentalFees.map((fee: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-black">
                                                {fee.category}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {fee.desc}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-black bg-pink-50/30">
                                                {fee.pink_price}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-black bg-emerald-50/30">
                                                {fee.mint_price}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {fee.note}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-gray-500">
                                            등록된 대관료 정보가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rules */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 mb-12">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-bold text-black">
                            이용 수칙
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            쾌적하고 안전한 체육관 이용을 위해 아래 수칙을 반드시 준수해
                            주시기 바랍니다.
                        </p>
                    </div>
                    <div className="px-4 py-5 sm:p-6 text-gray-700 space-y-6">
                        <div>
                            <h4 className="font-bold text-black mb-2 text-lg">
                                1. 복장 및 준비물
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                {usageRules.attire?.map((rule: string, i: number) => (
                                    <li key={i}>{rule}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-black mb-2 text-lg">
                                2. 시설 이용 및 안전
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                {usageRules.safety?.map((rule: string, i: number) => (
                                    <li key={i}>{rule}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-black mb-2 text-lg">
                                3. 음식물 및 청결
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                {usageRules.cleanliness?.map((rule: string, i: number) => (
                                    <li key={i}>{rule}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-bold text-black">
                            오시는 길
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            주소: 충청남도 천안시 서북구 마치로 122
                        </p>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Map */}
                            <div className="w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <iframe
                                    src="https://maps.google.com/maps?q=천안시+서북구+마치로+122&output=embed"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    title="Google Map"
                                ></iframe>
                            </div>

                            {/* Parking Info and Navigation */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-black text-lg mb-2">
                                        주차 안내
                                    </h4>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap mb-4">
                                        {parkingInfo.text || "주차 안내 정보가 없습니다."}
                                    </p>
                                    <div className="w-full h-[250px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                                        {parkingInfo.image_url ? (
                                            <img
                                                src={parkingInfo.image_url}
                                                alt="주차장 안내도"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                이미지 없음
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 text-center mt-2">
                                        * 위성 사진 또는 약도를 참고하여 주차해 주세요.
                                    </p>
                                </div>

                                {/* T-Map Directions Button */}
                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-black text-md mb-3">
                                        내비게이션 바로가기
                                    </h4>
                                    <div className="flex gap-2">
                                        <a
                                            href={`https://apis.openapi.sk.com/tmap/app/routes?appKey=${process.env.NEXT_PUBLIC_TMAP_APP_KEY}&name=스포라운드&lon=127.1368&lat=36.8527`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-red-600 text-white text-center py-3 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2"
                                        >
                                            {/* Temporary Text Icon */}
                                            <span className="text-sm">T-Map 길찾기</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
