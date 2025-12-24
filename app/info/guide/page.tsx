export default function GuidePage() {
    return (
        <div className="bg-white min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        이용 안내
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        대관료 및 이용 수칙을 안내해드립니다.
                    </p>
                </div>

                {/* Pricing Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-12 border border-gray-200">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            대관료 안내
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-center">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">구분</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">내용</th>
                                    <th className="px-6 py-3 text-xs font-bold text-pink-600 uppercase tracking-wider bg-pink-50">핑크 코트 (시간당)</th>
                                    <th className="px-6 py-3 text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50">민트 코트 (시간당)</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">비고</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">일일대관</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">기본 대관</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-pink-50/30">85,000원</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-emerald-50/30">75,000원</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">4시간 이상 시 대기실 무료</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium" rowSpan={3}>정기대관</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">월 단위 계약</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-pink-50/30">75,000원</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-emerald-50/30">65,000원</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">-</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-500">3개월 단위 계약</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-pink-50/30">70,000원</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-emerald-50/30">60,000원</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">-</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        할인 시간대<br />
                                        <span className="text-xs text-gray-400">(평일 09시 전/22시 후, 주말 08시 전/21시 후)</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-pink-50/30">60,000원</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-emerald-50/30">50,000원</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rules */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            이용 수칙
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6 text-gray-600 space-y-2">
                        <p>1. 체육관 내에서는 반드시 전용 실내 운동화를 착용해야 합니다.</p>
                        <p>2. 음식물 반입은 원칙적으로 금지되며, 음료는 뚜껑이 있는 용기만 허용됩니다.</p>
                        <p>3. 시설 파손 시 배상 책임이 발생할 수 있습니다.</p>
                        <p>4. 대관 시간 내 준비 및 정리 시간이 포함되어 있습니다.</p>
                        <p>5. 쓰레기는 반드시 지정된 장소에 분리수거 해주세요.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
