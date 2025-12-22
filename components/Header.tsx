"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="font-extrabold text-xl tracking-tight">
                    <span className="text-pink-600">SPO</span>ROUND
                </Link>

                <nav className="flex gap-6">
                    <Link
                        href="/"
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-pink-600",
                            pathname === "/" ? "text-pink-600" : "text-gray-600"
                        )}
                    >
                        대관/예약
                    </Link>
                    <Link
                        href="/programs"
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-pink-600",
                            pathname === "/programs" ? "text-pink-600" : "text-gray-600"
                        )}
                    >
                        프로그램 소개
                    </Link>
                </nav>
            </div>
        </header>
    );
}
