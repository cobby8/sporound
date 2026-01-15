"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2, Save, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

type Facility = {
    id: string;
    title: string;
    description: string[]; // JSONB array of strings
    image_url: string | null;
    order_index: number;
};

export default function CMSFacilityPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Facility>>({});
    const [tempDesc, setTempDesc] = useState(""); // For adding new description lines

    // Fetch Facilities
    const fetchFacilities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("facilities")
            .select("*")
            .order("order_index", { ascending: true });

        if (error) {
            console.error(error);
            alert("데이터를 불러오는데 실패했습니다.");
        } else {
            setFacilities(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFacilities();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        const { error } = await supabase.from("facilities").delete().eq("id", id);
        if (error) alert("삭제 실패");
        else fetchFacilities();
    };

    const handleSave = async () => {
        if (!editData.title) return alert("시설명을 입력해주세요.");

        try {
            if (editData.id) {
                // Update
                const { error } = await supabase.from("facilities").update(editData).eq("id", editData.id);
                if (error) throw error;
            } else {
                // Insert
                const maxOrder = facilities.length > 0 ? Math.max(...facilities.map(f => f.order_index)) : 0;
                const { error } = await supabase.from("facilities").insert({ ...editData, order_index: maxOrder + 1 });
                if (error) throw error;
            }
            setIsEditing(false);
            setEditData({});
            fetchFacilities();
        } catch (error: any) {
            console.error(error);
            alert("저장 실패: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">시설 안내 관리</h1>
                    <button
                        onClick={() => { setEditData({ description: [] }); setIsEditing(true); }}
                        className="bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Plus className="w-5 h-5" /> 시설 추가
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="grid gap-6">
                        {facilities.map((facility) => (
                            <div key={facility.id} className="bg-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-32 h-24 bg-gray-200 rounded-lg flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                    {facility.image_url ? (
                                        <Image src={facility.image_url} alt={facility.title} fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{facility.title}</h3>
                                    <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                        {facility.description?.map((desc, i) => (
                                            <li key={i}>{desc}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditData(facility); setIsEditing(true); }}
                                        className="text-gray-500 hover:text-black p-2 bg-gray-100 rounded-lg"
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={() => handleDelete(facility.id)}
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
                            <h2 className="text-xl font-bold">{editData.id ? "시설 수정" : "시설 추가"}</h2>
                            <button onClick={() => setIsEditing(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">시설명</label>
                                <input
                                    className="w-full border rounded-lg p-2"
                                    value={editData.title || ""}
                                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">특징 (한 줄씩 추가)</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        className="flex-1 border rounded-lg p-2"
                                        value={tempDesc}
                                        onChange={e => setTempDesc(e.target.value)}
                                        onKeyPress={e => {
                                            if (e.key === 'Enter' && tempDesc.trim()) {
                                                setEditData({
                                                    ...editData,
                                                    description: [...(editData.description || []), tempDesc.trim()]
                                                });
                                                setTempDesc("");
                                            }
                                        }}
                                        placeholder="특징을 입력하고 추가 버튼을 누르세요"
                                    />
                                    <button
                                        onClick={() => {
                                            if (tempDesc.trim()) {
                                                setEditData({
                                                    ...editData,
                                                    description: [...(editData.description || []), tempDesc.trim()]
                                                });
                                                setTempDesc("");
                                            }
                                        }}
                                        className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
                                    >
                                        추가
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {editData.description?.map((desc, i) => (
                                        <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                            <span>{desc}</span>
                                            <button
                                                onClick={() => {
                                                    const newDesc = [...(editData.description || [])];
                                                    newDesc.splice(i, 1);
                                                    setEditData({ ...editData, description: newDesc });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Image Upload would go here */}
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
