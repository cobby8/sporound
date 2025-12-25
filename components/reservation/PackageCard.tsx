import React from 'react';
import { Package } from '../../utils/pricingCalculator';

interface PackageCardProps {
    pkg: Package;
    isSelected: boolean;
    onSelect: (pkg: Package) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({ pkg, isSelected, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(pkg)}
            className={`
                relative flex-shrink-0 w-32 p-3 rounded-2xl border transition-all duration-300 text-left group
                ${isSelected
                    ? 'bg-pink-500/10 border-[#FF0099] shadow-[0_0_15px_rgba(255,0,153,0.3)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
            `}
        >
            {/* Badge */}
            {pkg.badge_text && (
                <div className={`
                    absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase
                    ${isSelected ? 'bg-[#FF0099] text-white shadow-md' : 'bg-gray-700 text-gray-300'}
                `}>
                    {pkg.badge_text}
                </div>
            )}

            <div className="mt-2 text-center">
                <h3 className={`text-xs font-semibold mb-1 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {pkg.name}
                </h3>
                <div className="text-white font-bold text-sm tracking-tight">
                    {(pkg.total_price / 10000).toLocaleString()}만
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                    {pkg.start_time.slice(0, 5)}~{pkg.end_time.slice(0, 5)}
                </div>
            </div>
        </button>
    );
};
