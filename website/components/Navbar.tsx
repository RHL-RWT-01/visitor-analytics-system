'use client';

import { sendEvent } from '@/utils/eventSender';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    const linkClasses = (path: string) =>
        `px-5 py-2 rounded-md font-medium transition duration-200 ease-in-out 
     hover:bg-blue-100 hover:text-blue-700 
     ${pathname === path ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700'}`;

    const handleLinkClick = async (
        e: React.MouseEvent<HTMLAnchorElement>,
        path: string
    ) => {
        e.preventDefault();
        await sendEvent('pageview', path);
        router.push(path);
    };

    return (
        <nav className="w-full bg-gradient-to-r from-white via-blue-50 to-white shadow-md border-b border-blue-200 px-8 py-5 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between">
                <div className="flex flex-wrap gap-4 text-base">
                    <Link href="/" onClick={(e) => handleLinkClick(e, '/')} className={linkClasses('/')}>
                        Home
                    </Link>
                    <Link href="/about" onClick={(e) => handleLinkClick(e, '/about')} className={linkClasses('/about')}>
                        About
                    </Link>
                    <Link href="/contact" onClick={(e) => handleLinkClick(e, '/contact')} className={linkClasses('/contact')}>
                        Contact
                    </Link>
                    <Link href="/products" onClick={(e) => handleLinkClick(e, '/products')} className={linkClasses('/products')}>
                        Products
                    </Link>
                </div>
            </div>
        </nav>
    );
}
