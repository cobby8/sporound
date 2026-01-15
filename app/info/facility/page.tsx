import { supabase } from "@/lib/supabase";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function FacilityPage() {
    const { data: facilities } = await supabase
        .from("facilities")
        .select("*")
        .order("order_index", { ascending: true });

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="bg-black text-white py-20 px-4 text-center">
                <h1 className="text-4xl font-bold mb-4">시설 안내</h1>
                <p className="text-lg text-gray-300">
                    최고급 바닥재와 냉난방 시설이 완비된 프리미엄 코트
                </p>
            </section>

            {/* Courts */}
            <section className="max-w-5xl mx-auto py-12 px-4 space-y-12">
                {facilities?.map((facility, idx) => (
                    <div
                        key={facility.id}
                        className={`bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col ${idx % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                            }`}
                    >
                        <div className="md:w-1/2 h-64 md:h-auto relative bg-gray-200">
                            {facility.image_url ? (
                                <Image
                                    src={facility.image_url}
                                    alt={facility.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    이미지 없음
                                </div>
                            )}
                        </div>
                        <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
                            <h2 className="text-3xl font-bold mb-6 text-black">
                                {facility.title}
                            </h2>
                            <ul className="space-y-4">
                                {facility.description?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-600 mt-2.5" />
                                        <span className="text-lg text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}
