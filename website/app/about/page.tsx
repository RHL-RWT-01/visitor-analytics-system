"use client";

import { sendEvent } from '@/utils/eventSender';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react'; 

const AboutPage: React.FC = () => {
  useEffect(() => {
    sendEvent('pageview', '/about');
  }, []); 
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Head>
        <title>About Us</title>
      </Head>

      <main className="bg-white p-8 rounded-lg shadow-md text-center max-w-lg w-full">
        <h1 className="text-3xl font-bold text-blue-700 mb-4">About Our Simulated Website</h1>
        <p className="text-gray-700 mb-6">
          We are a fictional entity designed purely for the purpose of generating data for a real-time analytics dashboard.
          Our mission is to provide meaningful page views and clicks!
        </p>
        <Link href="/" className="block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300">
            Back to Home
        </Link>
      </main>
    </div>
  );
};

export default AboutPage;