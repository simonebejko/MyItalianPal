"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Logo from '/app/logo.png';


const routes = [
    {
        name: "Chat",
        path: "/",
    },
    {
        name: "Settings",
        path: "/settings",
    }
]

function Navbar() {
    const pathname = usePathname();

    return <nav className="p-2 flex flex-row justify-between items-center bg-neutral-200 text-black">
        <Link href="/" className="flex items-center space-x-3">
            <img src={Logo.src} className="h-8" alt="MyItalianPal Logo" />
            <h1 className="self-center text-2xl font-semibold whitespace-nowrap">MyItalianPal</h1>
        </Link>
        <div className="flex gap-x-6 text-lg items-center">
            {routes.map((route, idx) => (
                <Link
                    key={idx}
                    href={route.path}
                    className={
                        pathname === route.path ? "border-b-2 border-red-500" : ""
                    }
                >
                    {route.name}
                </Link>
            ))}

            <UserButton afterSignOutUrl="/" />
        </div>
    </nav>
}

export default Navbar