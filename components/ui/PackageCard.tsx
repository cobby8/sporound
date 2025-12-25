"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PackageCardProps {
    title: string;
    price: number;
    originalPrice?: number;
    discountRate?: number; // e.g., 50 (for 50%)
    description?: string;
    isSelected: boolean;
    onSelect: () => void;
    badge?: string; // e.g., "BEST"
    colorTheme?: "pink" | "mint"; // Main accent color
}

export function PackageCard({
    title,
    price,
    originalPrice,
    discountRate,
    description,
    isSelected,
    onSelect,
    badge,
    colorTheme = "pink"
}: PackageCardProps) {

    const accentColor = colorTheme === "pink" ? "border-pink-500 shadow-pink-500/20" : "border-emerald-500 shadow-emerald-500/20";
    const glow = isSelected ? `border-2 ${accentColor} shadow-lg bg-white/10` : "border border-white/10 bg-white/5 hover:bg-white/10";

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={cn(
                "relative min-w-[140px] p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between h-[160px] snap-center shrink-0",
                glow
            )}
        >
            {/* Selection Checkmark */}
            {isSelected && (
                <div className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md",
                    colorTheme === 'pink' ? 'bg-pink-500' : 'bg-emerald-500'
                )}>
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
            )}

            {/* Badge */}
            <div className="flex items-start justify-between mb-2">
                {discountRate ? (
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full text-white",
                        colorTheme === 'pink' ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
                    )}>
                        {discountRate}% OFF
                    </span>
                ) : badge ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {badge}
                    </span>
                ) : <div className="h-4"></div>}
            </div>

            {/* Content */}
            <div className="space-y-1">
                <h3 className={cn("text-sm font-bold leading-tight", isSelected ? "text-white" : "text-white/70")}>
                    {title}
                </h3>
                {description && <p className="text-[10px] text-white/50 line-clamp-2">{description}</p>}
            </div>

            {/* Price */}
            <div className="mt-auto">
                {originalPrice && (
                    <p className="text-[10px] text-white/40 line-through decoration-white/40 mb-0.5">
                        {originalPrice.toLocaleString()}
                    </p>
                )}
                <p className={cn("text-lg font-bold tracking-tight", isSelected ? "text-white" : "text-white/80")}>
                    {price.toLocaleString()}
                    <span className="text-[10px] font-normal ml-0.5">원</span>
                </p>
            </div>
        </motion.div>
    );
}
