export default function FacilityPage() {
    return (
        <div className="bg-white min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        시설 안내
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        최고급 바닥재와 조명이 완비된 프리미엄 농구 코트
                    </p>
                </div>

                <div className="mt-16 bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            {/* Image Placeholder */}
                            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 mb-4">
                                <span>시설 사진 1</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">제 1코트 (핑크)</h3>
                            <ul className="mt-2 list-disc list-inside text-gray-600">
                                <li>국제 규격 농구 코트</li>
                                <li>충격 흡수 최고급 마루</li>
                                <li>냉난방 완비</li>
                            </ul>
                        </div>
                        <div>
                            {/* Image Placeholder */}
                            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 mb-4">
                                <span>시설 사진 2</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">제 2코트 (민트)</h3>
                            <ul className="mt-2 list-disc list-inside text-gray-600">
                                <li>3x3 전용 규격</li>
                                <li>개인 연습 최적화</li>
                                <li>독립된 연습 공간</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
