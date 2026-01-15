import { supabase } from "@/lib/supabase";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ProgramPage() {
    // Fetch Coaches using the singleton client (Public Access)
    const { data: coaches } = await supabase
        .from("coaches")
        .select("*")
        .order("order_index", { ascending: true });

    const classes = [
        {
            title: "유소년 농구 교실",
            target: "초등학생 ~ 중학생",
            desc: "성장기 아이들의 신체 발달과 사회성 함양을 위한 프로그램입니다.",
            color: "bg-orange-50",
            textColor: "text-orange-600",
        },
        {
            title: "성인 농구 레슨",
            target: "고등학생 ~ 성인",
            desc: "초보자부터 숙련자까지, 개인별 레벨에 맞춘 체계적인 트레이닝을 제공합니다.",
            color: "bg-blue-50",
            textColor: "text-blue-600",
        },
        {
            title: "팀 트레이닝",
            target: "동호회 및 클럽 팀",
            desc: "팀 전술 이해와 조직력 강화를 위한 맞춤형 팀 훈련 프로그램입니다.",
            color: "bg-green-50",
            textColor: "text-green-600",
        },
    ];

    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative h-[400px] flex items-center justify-center bg-black">
                <div className="absolute inset-0 opacity-50">
                    <Image
                        src="/images/program_hero.jpg"
                        alt="Program Hero"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <div className="relative z-10 text-center text-white p-4">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">프로그램 소개</h1>
                    <p className="text-lg md:text-xl text-gray-200">
                        체계적인 커리큘럼과 전문 코치진이 함께합니다.
                    </p>
                </div>
            </section>

            {/* Class Categories */}
            <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4 text-black">클래스 안내</h2>
                    <p className="text-gray-600 text-lg">
                        연령과 레벨에 맞는 다양한 프로그램을 만나보세요.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {classes.map((cls, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
                        >
                            <div
                                className={`w-16 h-16 ${cls.color} rounded-xl mb-6 flex items-center justify-center`}
                            >
                                <div className={`text-2xl font-bold ${cls.textColor}`}>
                                    {idx + 1}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-black">{cls.title}</h3>
                            <p className={`font-bold mb-4 ${cls.textColor}`}>{cls.target}</p>
                            <p className="text-gray-600 leading-relaxed">{cls.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Coaches Section */}
            <section className="py-20 bg-gray-50 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4 text-black">코치진 소개</h2>
                        <p className="text-gray-600 text-lg">
                            엘리트 선수 출신의 전문 코치진을 소개합니다.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {coaches?.map((coach) => (
                            <div
                                key={coach.id}
                                className="bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row hover:-translate-y-1 transition-transform duration-300"
                            >
                                <div className="w-full md:w-1/2 h-80 relative bg-gray-200">
                                    {coach.image_url ? (
                                        <Image
                                            src={coach.image_url}
                                            alt={coach.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            이미지 없음
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 flex flex-col justify-center md:w-1/2">
                                    <h3 className="text-2xl font-bold mb-2 text-black">
                                        {coach.name}
                                    </h3>
                                    <p className="text-pink-600 font-bold mb-4">{coach.role}</p>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {coach.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4 text-black">갤러리</h2>
                    <p className="text-gray-600 text-lg">
                        열정 넘치는 훈련 현장을 확인해보세요.
                    </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="aspect-square bg-gray-200 rounded-xl relative overflow-hidden hover:opacity-90 transition-opacity"
                        >
                            <Image
                                src={`/images/gallery_${item}.jpg`}
                                alt={`Gallery ${item}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
