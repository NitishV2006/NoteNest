
import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="text-center py-16 px-4 sm:px-6 lg:px-8 bg-white rounded-lg shadow-xl">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
        Welcome to <span className="text-blue-600">Note Nest</span>
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500">
        Your central hub for academic resources. Faculty can easily upload notes, and students can access them anytime, anywhere.
      </p>
      <div className="mt-8 flex justify-center space-x-4">
        <Link 
          to="/login"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
        >
          Get Started
        </Link>
        <a 
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
        >
          Learn More
        </a>
      </div>
       <div className="mt-16">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Features for Everyone</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">For Students</h3>
            <p className="mt-2 text-gray-600">Access and download notes from your department, search by title or faculty, and stay organized with date filters.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">For Faculty</h3>
            <p className="mt-2 text-gray-600">Upload lecture notes, assignments, and other materials for your department with a simple and intuitive interface.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">For Admins</h3>
            <p className="mt-2 text-gray-600">Manage all users and content on the platform. Ensure the system runs smoothly with powerful administrative tools.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
