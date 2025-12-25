import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateDynamicPrice, fetchRulesAndPackages, PriceRule, Package } from '../utils/pricingCalculator';

export function useDynamicPricing() {
    // const supabase = createClientComponentClient(); // Removed
    const [rules, setRules] = useState<PriceRule[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const { rules, packages } = await fetchRulesAndPackages(supabase);
            setRules(rules);
            setPackages(packages);
            setLoading(false);
        };
        load();
    }, []);

    const getPrice = useCallback((date: Date, startTime: string, endTime: string, courtName: 'pink' | 'mint') => {
        if (loading) return { total: 0, rules: [] }; // Updated to match return signature

        const courtRules = rules.filter(r => r.name.toLowerCase().includes(courtName.toLowerCase()));
        const globalRules = rules.filter(r => r.court_id === null);

        // We need at least one rule with a court_id to identify the court for the calculator
        // OR we can pass the courtName string logic into the calculator?
        // The calculator expects a courtId. 
        // Existing logic in step 3684 tried to find effectiveCourtId.
        const effectiveCourtId = courtRules[0]?.court_id || "global"; // Fallback to avoid crash

        return calculateDynamicPrice(date, startTime, endTime, effectiveCourtId, [...courtRules, ...globalRules]);
    }, [rules, loading]);

    return {
        loading,
        rules,
        packages,
        getPrice
    };
}
