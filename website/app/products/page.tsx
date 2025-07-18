"use client";
import { sendEvent } from '@/utils/eventSender';
import Head from 'next/head';
import { useEffect } from 'react';

type Product = {
    id: number;
    name: string;
    description: string;
    price: number;
};

const products: Product[] = [
    { id: 1, name: 'Laptop', description: 'High-performance laptop', price: 75000 },
    { id: 2, name: 'Smartphone', description: 'Latest 5G smartphone', price: 40000 },
    { id: 3, name: 'Headphones', description: 'Noise-cancelling headphones', price: 8000 },
];

export default function ProductsPage() {
    useEffect(() => {
        sendEvent('pageview', '/products');
    }, []);

    const handleProductClick = (product: Product) => {

        sendEvent('click', '/products', {
            element: `product-card-${product.id}`,
            productId: product.id,
            productName: product.name,
            productPrice: product.price
        });
        alert(`You clicked on ${product.name}! Event sent to analytics.`);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            <Head>
                <title>Products</title>
            </Head>

            <main className="w-full max-w-5xl bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">Our Products</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-blue-50"
                            onClick={() => handleProductClick(product)} // Add click handler here
                        >
                            <h2 className="text-xl font-semibold text-blue-800 mb-2">{product.name}</h2>
                            <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                            <p className="text-blue-600 font-bold text-lg">₹{product.price.toLocaleString('en-IN')}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}