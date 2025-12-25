import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateDynamicPrice, fetchRulesAndPackages, PriceRule, Package } from '../utils/pricingCalculator';

export function useDynamicPricing() {
    const supabase = createClientComponentClient();
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

    const getPrice = (date: Date, startTime: string, endTime: string, courtName: 'pink' | 'mint') => {
        if (loading) return 0;

        // Need to resolve courtName string to UUID from the rules.
        // Strategy: Look for a rule that matches the court to find the ID, 
        // OR we need the court IDs handy. 
        // Hack: We can filter rules by inspecting the `name` if we didn't store court map,
        // BUT better: The rules have `court_id`. We need to match courtName to that ID.
        // Let's find ANY rule for that court.
        // For efficiency, maybe we fetch courts too, or just infer from rule names if structured?
        // Actually, the rules table has court_id.
        // Let's filter rules that *likely* belong to the correct court.
        // Since we don't have the Court Map mapped in client yet, we can try to guess or 
        // we should really fetch the Courts table too.

        // Quick fix: Filter by rules where name includes the court name (case insensitive) 
        // since we named them "SS Tier (Pink)..."
        // This is safe for now given our seeding.

        const courtRules = rules.filter(r => r.name.toLowerCase().includes(courtName.toLowerCase()));

        // Also include Global rules (court_id is null)
        const globalRules = rules.filter(r => r.court_id === null);

        const applicableRules = [...courtRules, ...globalRules];

        // We pass a dummy courtId to the calculator because we already filtered the list. 
        // The calculator checks court_id match, but if we pass the *Rule's* court_id it passes.
        // Wait, calculator logic: `if (r.court_id && r.court_id !== courtId) return false;`
        // So we DO need the real UUID.

        // Let's grab the UUID from the first matching rule.
        const effectiveCourtId = courtRules[0]?.court_id;

        if (!effectiveCourtId) {
            // Fallback if no rules found -> manual fallback logic or return 0
            return calculateDynamicPrice(date, startTime, endTime, "dummy-id", []);
        }

        return calculateDynamicPrice(date, startTime, endTime, effectiveCourtId, rules);
    };

    return {
        loading,
        rules,
        packages,
        getPrice
    };
}
