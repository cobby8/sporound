"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2, Save, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

type Coach = {
    id: string;
    name: string;
    role: string;
    description: string;
    image_url: string | null;
    order_index: number;
};

export default function CMSProgramPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Coach>>({});

    // Fetch Coaches
    const fetchCoaches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("coaches")
            .select("*")
            .order("order_index", { ascending: true });

        if (error) {
            console.error(error);
            alert("데이터를 불러오는데 실패했습니다.");
        } else {
            setCoaches(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCoaches();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        const { error } = await supabase.from("coaches").delete().eq("id", id);
        if (error) alert("삭제 실패");
        else fetchCoaches();
    };

    const handleSave = async () => {
        if (!editData.name) return alert("이름을 입력해주세요.");

        try {
            if (editData.id) {
                // Update
                const { error } = await supabase.from("coaches").update(editData).eq("id", editData.id);
                if (error) throw error;
            } else {
                // Insert
                const maxOrder = coaches.length > 0 ? Math.max(...coaches.map(c => c.order_index)) : 0;
                const { error } = await supabase.from("coaches").insert({ ...editData, order_index: maxOrder + 1 });
                if (error) throw error;
            }
            setIsEditing(false);
            setEditData({});
            fetchCoaches();
        } catch (error: any) {
            console.error(error);
            alert("저장 실패: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">프로그램 소개 관리</h1>
                    <button
                        onClick={() => { setEditData({}); setIsEditing(true); }}
                        className="bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Plus className="w-5 h-5" /> 코치 추가
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="grid gap-6">
                        {coaches.map((coach) => (
                            <div key={coach.id} className="bg-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                    {coach.image_url ? (
                                        <Image src={coach.image_url} alt={coach.name} fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900">{coach.name}</h3>
                                    <p className="text-pink-600 font-bold text-sm mb-2">{coach.role}</p>
                                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{coach.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditData(coach); setIsEditing(true); }}
                                        className="text-gray-500 hover:text-black p-2 bg-gray-100 rounded-lg"
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={() => handleDelete(coach.id)}
                                        className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editData.id ? "코치 수정" : "코치 추가"}</h2>
                            <button onClick={() => setIsEditing(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">이름</label>
                                <input
                                    className="w-full border rounded-lg p-2"
                                    value={editData.name || ""}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">담당 역할</label>
                                <input
                                    className="w-full border rounded-lg p-2"
                                    value={editData.role || ""}
                                    onChange={e => setEditData({ ...editData, role: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">소개글</label>
                                <textarea
                                    className="w-full border rounded-lg p-2 h-24"
                                    value={editData.description || ""}
                                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                                />
                            </div>
                            {/* Image Upload would go here - keeping it simple for now */}
                            <button
                                onClick={handleSave}
                                className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
