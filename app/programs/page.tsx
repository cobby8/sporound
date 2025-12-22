import Image from "next/image";

export default function ProgramsPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="bg-gray-900 text-white py-20 px-4 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-emerald-600/20 z-0"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">프로그램 소개</h1>
                    <p className="text-xl text-gray-300">
                        유소년부터 성인반, 선수반까지.<br />
                        스포라운드만의 체계적인 커리큘럼을 만나보세요.
                    </p>
                </div>
            </section>

            {/* Program Categories */}
            <section className="py-16 px-4 container mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center text-gray-800">CLASS</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Kids */}
                    <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow border border-gray-100">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">🌱</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-3">유소년 (초/중/고)</h3>
                        <p className="text-gray-600 leading-relaxed">
                            농구의 기초부터 실전 기술까지.<br />
                            성장기 아이들의 체력 증진과 사회성 함양을 위한 맞춤형 수업입니다.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                            <li>• 드리블/패스/슛 기본기</li>
                            <li>• 팀 전술 및 미니 게임</li>
                            <li>• 눈높이 맞춤 지도</li>
                        </ul>
                    </div>

                    {/* Adult */}
                    <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow border border-gray-100">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">🏀</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-3">성인 취미/동호회</h3>
                        <p className="text-gray-600 leading-relaxed">
                            퇴근 후 즐기는 활력소!<br />
                            초보자부터 숙련자까지 레벨별로 진행되는 그룹 레슨입니다.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                            <li>• 개인 스킬 향상</li>
                            <li>• 5:5 경기 운영 전술</li>
                            <li>• 체력 훈련 및 부상 방지</li>
                        </ul>
                    </div>

                    {/* Elite */}
                    <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow border border-gray-100">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">🏆</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-3">대표팀 / 선수반</h3>
                        <p className="text-gray-600 leading-relaxed">
                            엘리트 선수를 목표로 하거나,<br />
                            대회 입상을 노리는 팀을 위한 고강도 트레이닝입니다.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                            <li>• 전문적인 전술 훈련</li>
                            <li>• 포지션별 심화 코칭</li>
                            <li>• 대회 참가 및 실전 경험</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Instructors */}
            <section className="bg-gray-50 py-16 px-4">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold mb-10 text-center text-gray-800">INSTRUCTORS</h2>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-6">
                            <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0"></div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">정훈 코치님</h3>
                                <p className="text-emerald-600 font-medium text-sm mb-2">유소년 / 대표팀 담당</p>
                                <p className="text-gray-500 text-sm">"기본기가 탄탄해야 실력이 늡니다. 즐겁지만 진지하게 가르칩니다."</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-6">
                            <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0"></div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">창민 코치님</h3>
                                <p className="text-pink-600 font-medium text-sm mb-2">중고등 / 성인반 담당</p>
                                <p className="text-gray-500 text-sm">"열정만 가지고 오세요. 나머지는 제가 만들어 드립니다."</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Facilities / Gallery */}
            <section className="py-16 px-4 container mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center text-gray-800">GALLERY & FACILITY</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                </div>
            </section>
        </main>
    );
}
