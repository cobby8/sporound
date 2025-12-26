"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/utils/format";
import { GlassModalWrapper } from "./ui/GlassModalWrapper";
import { PackageCard } from "./ui/PackageCard";
import { useDynamicPricing } from "@/hooks/useDynamicPricing";

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    startTime: string;
    endTime: string;
    selectedDay: string;
    selectedDate: string;
    selectedCourt: "pink" | "mint";
}

export function ReservationModal({
    isOpen,
    onClose,
    startTime: propStartTime,
    endTime: propEndTime,
    selectedDay,
    selectedDate,
    selectedCourt,
}: ReservationModalProps) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        teamName: "",
        contact: "",
        purpose: "",
        peopleCount: 1,
    });

    // Internal State for overrides (Package Selection)
    const [startTime, setStartTime] = useState(propStartTime);
    const [endTime, setEndTime] = useState(propEndTime);

    const [totalPrice, setTotalPrice] = useState(0);
    const [standardPrice, setStandardPrice] = useState(0); // The base "Daily" price
    const [duration, setDuration] = useState(1);
    const [basePeakPrice, setBasePeakPrice] = useState(0);

    const [reservationType, setReservationType] = useState<"daily" | "monthly" | "3month" | "package">("daily");
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [viewingPackage, setViewingPackage] = useState<any>(null); // For the popup

    // Check user on open
    useEffect(() => {
        if (isOpen) {
            checkUser();
            // Reset State
            setReservationType("daily");
            setSelectedPackage(null);
            setStartTime(propStartTime);
            setEndTime(propEndTime);
        }
    }, [isOpen, propStartTime, propEndTime]);

    const checkUser = async () => {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        setUser(data.user);

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            setFormData(prev => ({
                ...prev,
                name: profile?.name || data.user?.user_metadata?.full_name || "",
                contact: profile?.phone || data.user?.user_metadata?.phone || "",
            }));
        }
        setLoading(false);
    };

    // Price Calculation Logic
    const { getPrice, rules, packages, loading: pricingLoading } = useDynamicPricing();
    const [recommendedPackages, setRecommendedPackages] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen || pricingLoading) return;

        // 1. Identify Court ID from rules
        const relevantRule = rules.find(r => r.name.toLowerCase().includes(selectedCourt));
        const currentCourtId = relevantRule?.court_id;

        if (currentCourtId) {
            // 2. Filter Recommendations (Using Original Props to suggest relevant packs)
            const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            const sMins = toMinutes(propStartTime);
            const eMins = toMinutes(propEndTime);

            // Get current day index (0=Sun, 6=Sat) based on selectedDate string
            const currentDayIndex = new Date(selectedDate).getDay();

            const recs = packages.filter(pkg => {
                if (pkg.court_id !== currentCourtId) return false;

                // Filter by Day of Week 
                if (Array.isArray(pkg.days_of_week) && !pkg.days_of_week.includes(currentDayIndex)) {
                    return false;
                }

                const pkgStart = toMinutes(pkg.start_time);
                const pkgEnd = toMinutes(pkg.end_time);
                return pkgStart <= sMins && pkgEnd >= eMins;
            });
            setRecommendedPackages(recs);
        }
    }, [isOpen, pricingLoading, rules, packages, selectedCourt, propStartTime, propEndTime, selectedDate]);


    useEffect(() => {
        if (!isOpen) return;

        // If a package is selected, use fixed package price
        if (reservationType === 'package' && selectedPackage) {
            setTotalPrice(selectedPackage.total_price);

            // Recalculate duration for display
            const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            const s = toMinutes(selectedPackage.start_time);
            const e = toMinutes(selectedPackage.end_time);
            setDuration((e - s) / 60);

            // Base peak (Just for reference, maybe not needed for package?)
            setBasePeakPrice(0); // Packages have their own "Badge" for discount
            return;
        }

        const calculatePrice = () => {
            const dateObj = new Date(selectedDate);
            const toMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
            };
            const startMinutes = toMinutes(startTime);
            const endMinutes = toMinutes(endTime);
            const durationMinutes = endMinutes - startMinutes;
            const hours = durationMinutes / 60;

            setDuration(hours);

            // Base Peak Price Calculation (for Strikethrough)
            const peakRate = selectedCourt === 'pink' ? 85000 : 75000;
            setBasePeakPrice(peakRate * hours);

            const isEvent = formData.peopleCount >= 50;
            let currentStandardPrice = 0;

            if (isEvent) {
                let unitPrice = 0;
                if (formData.peopleCount >= 200) unitPrice = 400000;
                else if (formData.peopleCount >= 150) unitPrice = 300000;
                else if (formData.peopleCount >= 100) unitPrice = 250000;
                else unitPrice = selectedCourt === 'pink' ? 110000 : 90000;
                currentStandardPrice = unitPrice * hours;
            } else {
                // Dynamic Rule Calculation
                const { total } = getPrice(dateObj, startTime, endTime, selectedCourt as 'pink' | 'mint');
                currentStandardPrice = total;
            }

            setStandardPrice(Math.floor(currentStandardPrice / 100) * 100);

            // Apply Discount based on Type
            let finalPrice = currentStandardPrice;
            if (reservationType === 'monthly') {
                finalPrice = finalPrice * 0.9;
            } else if (reservationType === '3month') {
                finalPrice = finalPrice * 0.8;
            }

            setTotalPrice(Math.floor(finalPrice / 100) * 100);
        };

        if (!pricingLoading) {
            calculatePrice();
        }
    }, [isOpen, startTime, endTime, selectedDate, selectedCourt, formData.peopleCount, reservationType, pricingLoading, getPrice, selectedPackage]);

    const copyAccount = () => {
        navigator.clipboard.writeText("394-910573-99907");
        alert("계좌번호가 복사되었습니다.");
    };

    const handleContactAdmin = () => {
        alert("관리자 연락처: 010-0000-0000\n(기능 준비중입니다)");
    };

    const applyPackage = () => {
        if (!viewingPackage) return;
        setSelectedPackage(viewingPackage);
        setReservationType('package');
        setStartTime(viewingPackage.start_time.slice(0, 5));
        setEndTime(viewingPackage.end_time.slice(0, 5));
        setViewingPackage(null); // Close popup
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        // 1. Get court ID
        const { data: courtData } = await supabase
            .from('courts')
            .select('id')
            .eq('name', selectedCourt)
            .single();

        if (!courtData) {
            alert('코트 정보를 찾을 수 없습니다.');
            return;
        }

        // 2. Insert Reservation
        const { error } = await supabase
            .from('reservations')
            .insert({
                court_id: courtData.id,
                date: selectedDate,
                start_time: startTime,
                end_time: endTime,
                purpose: formData.purpose,
                user_id: user.id,
                people_count: formData.peopleCount,
                total_price: totalPrice,
                status: 'pending',
                team_name: formData.teamName || null,
                payment_status: 'unpaid',
            });

        if (error) {
            console.error(error);
            alert('예약 신청 중 오류가 발생했습니다.');
        } else {
            alert(`예약이 접수되었습니다!\n\n[입금안내]\n하나은행 394-910573-99907 이창민\n입금액: ${totalPrice.toLocaleString()}원\n\n입금이 확인되면 예약이 확정됩니다.`);
            onClose();
            setFormData({ name: "", teamName: "", contact: "", purpose: "", peopleCount: 1 });
        }
    };

    const courtName = selectedCourt === "pink" ? "핑크 코트" : "민트 코트";

    // Mapped Packages for UI (Using standardPrice to keep them static)
    const packageOptions = [
        {
            id: 'daily',
            title: '일일 대관',
            price: standardPrice,
            originalPrice: (basePeakPrice > standardPrice) ? basePeakPrice : undefined,
            description: '1회성 자유 예약',
            badge: 'BASIC',
            discountRate: 0
        },
        {
            id: 'monthly',
            title: '1개월 정기',
            price: Math.floor(standardPrice * 0.9),
            description: '월 4회 이상 (10% 할인)',
            badge: '10% OFF',
            discountRate: 10
        },
        {
            id: '3month',
            title: '3개월 정기',
            price: Math.floor(standardPrice * 0.8),
            description: '장기 계약 (20% 할인)',
            badge: '20% OFF',
            discountRate: 20
        }
    ];

    return (
        <GlassModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Court Reservation"
            className="border-t border-white/10"
        >
            <div className="space-y-8 pb-20 relative">

                {/* 1. Header Info */}
                <div className="text-center space-y-1">
                    <p className="text-white/60 text-sm">{selectedDate} ({selectedDay})</p>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {startTime} - {endTime} <span className="text-base font-normal text-white/50">({duration}h)</span>
                    </h2>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${selectedCourt === 'pink' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {courtName}
                    </div>
                </div>

                {/* 2. Package Selection (Horizontal Scroll) */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white/70 px-1">TYPE</label>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x">
                        {packageOptions.map((pkg) => (
                            <PackageCard
                                key={pkg.id}
                                title={pkg.title}
                                price={pkg.price}
                                originalPrice={pkg.originalPrice}
                                description={pkg.description}
                                isSelected={reservationType === pkg.id}
                                onSelect={() => {
                                    setReservationType(pkg.id as any);
                                    setSelectedPackage(null); // Reset package override
                                    setStartTime(propStartTime); // Reset time
                                    setEndTime(propEndTime);
                                }}
                                discountRate={pkg.discountRate}
                                colorTheme={selectedCourt}
                            />
                        ))}
                    </div>
                </div>

                {/* Recommended Packages Section */}
                {recommendedPackages.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <label className="text-sm font-medium text-white/70">추천 패키지</label>
                            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1.5 py-0.5 rounded-sm font-bold">BEST</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                            {recommendedPackages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    onClick={() => setViewingPackage(pkg)}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer border hover:bg-white/5 ${selectedPackage?.id === pkg.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'border-transparent hover:border-white/10'}`}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{pkg.name}</span>
                                            {pkg.badge_text && (
                                                <span className="text-[10px] bg-white/20 text-white px-1 py-0.5 rounded">{pkg.badge_text}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-white/50">{pkg.start_time.slice(0, 5)} ~ {pkg.end_time.slice(0, 5)} | {pkg.description}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${selectedPackage?.id === pkg.id ? 'text-emerald-400' : 'text-emerald-400'}`}>{pkg.total_price.toLocaleString()}원</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* viewingPackage Modal Overlay */}
                {viewingPackage && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl" onClick={() => setViewingPackage(null)} />
                        <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-40 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-2">{viewingPackage.name}</h3>
                            <div className="space-y-4">
                                <div className="bg-white/5 p-3 rounded-lg space-y-1">
                                    <p className="text-sm text-white/60">시간</p>
                                    <p className="text-lg font-bold text-white">{viewingPackage.start_time.slice(0, 5)} ~ {viewingPackage.end_time.slice(0, 5)}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg space-y-1">
                                    <p className="text-sm text-white/60">가격</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-2xl font-bold text-emerald-400">{viewingPackage.total_price.toLocaleString()}원</p>
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{viewingPackage.badge_text || 'Special'}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    {viewingPackage.description}
                                </p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setViewingPackage(null)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={applyPackage}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    적용하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* 3. Details Form (Glass Inputs) */}
                <div className="space-y-5">

                    {/* User Info Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-white/50 pl-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                                placeholder="신청자명"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-white/50 pl-1">Contact</label>
                            <input
                                type="tel"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: formatPhoneNumber(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                                placeholder="연락처"
                            />
                        </div>
                    </div>

                    {/* Team & People */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/50 pl-1">Team Name <span className="text-white/30">(Optional)</span></label>
                        <input
                            type="text"
                            value={formData.teamName}
                            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                            placeholder="팀명 또는 단체명"
                        />
                    </div>

                    {/* People Count Slider/Counter */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <label className="text-sm text-white/80 font-medium block">인원 수</label>
                            <span className="text-xs text-white/40">50명 이상 시 행사 요금 적용</span>
                        </div>
                        <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                            <button
                                onClick={() => setFormData(p => ({ ...p, peopleCount: Math.max(1, p.peopleCount - 1) }))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                min={1}
                                value={formData.peopleCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setFormData(p => ({ ...p, peopleCount: Math.max(1, val) }));
                                }}
                                className="w-12 bg-transparent text-center text-white font-bold focus:outline-none [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                            />
                            <button
                                onClick={() => setFormData(p => ({ ...p, peopleCount: p.peopleCount + 1 }))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-white/50 pl-1">Purpose</label>
                        <textarea
                            rows={2}
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm resize-none"
                            placeholder="대관 목적 (농구 경기, 촬영 등)"
                        />
                    </div>

                    {/* Contact Admin Button */}
                    <button
                        type="button"
                        onClick={handleContactAdmin}
                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white text-xs py-3 rounded-lg transition-all"
                    >
                        관리자에게 연락하기 / 문의하기
                    </button>

                </div>
            </div>

            {/* 4. Bottom Fixed Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur-xl border-t border-white/10 z-20">
                <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                    <div className="flex flex-col">
                        <span className="text-xs text-white/50">Total Payment</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white tracking-tight">{totalPrice.toLocaleString()}</span>
                            <span className="text-sm text-white/60">원</span>
                        </div>
                        <button onClick={copyAccount} className="text-[10px] text-white/40 underline text-left hover:text-white/80">
                            계좌복사: 하나은행 394-910573-99907
                        </button>
                    </div>
                    <button
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={loading}
                        className={`px-8 py-3 rounded-2xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${selectedCourt === 'pink'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-pink-500/25'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25'
                            }`}
                    >
                        {loading ? 'Processing...' : 'Reserve Now'}
                    </button>
                </div>
            </div>

        </GlassModalWrapper>
    );
}

