"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    className?: string;
}

export function GlassModalWrapper({ isOpen, onClose, children, title, className }: GlassModalWrapperProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "relative w-full max-h-[90vh] sm:max-w-lg bg-gray-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col text-white",
                                className
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10 shrink-0">
                                <h2 className="text-lg font-bold tracking-tight text-white/90">
                                    {title || 'Reservation'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-hide">
                                {children}
                            </div>

                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
