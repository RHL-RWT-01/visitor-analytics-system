'use client';
import { sendEvent } from '@/utils/eventSender';
import Head from 'next/head';
import { useState } from 'react';  

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitted data:', formData);

        await sendEvent('form_submit', '/contact', {
            formType: 'contact',
            nameLength: formData.name.length,
            emailProvided: !!formData.email
        });

        alert('Thank you for contacting us! A form_submit event has been sent to analytics.');
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
            <Head>
                <title>Contact Us - Website Simulator</title>
            </Head>

            <main className="bg-white p-8 rounded-lg shadow-md text-center max-w-lg w-full">
                <h1 className="text-3xl font-bold text-blue-700 mb-6">Contact Us</h1>
                <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 mx-auto">
                    <input
                        name="name"
                        type="text"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Your Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <textarea
                        name="message"
                        placeholder="Your Message"
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition-colors duration-200"
                    >
                        Send Message
                    </button>
                </form>
            </main>
        </div>
    );
}