import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

export default function Login() {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>(UserRole.STUDENT);
  const [message, setMessage] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { login, register, error, loading, clearError, user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If the user is authenticated, redirect them from the login page to their dashboard.
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Clear previous errors and messages when switching forms
    clearError();
    setMessage('');
  }, [view, clearError]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      if (view === 'login') {
        await login(email, password);
        // Navigation is now handled by the useEffect hook.
      } else {
        const result = await register(name, email, password, role);
        // Check if registration was successful but requires email confirmation
        if (result.data.user && !result.data.session) {
            setRegistrationComplete(true);
        }
        // If a session is created, the useEffect will handle navigation.
      }
    } catch (err) {
      // Error is displayed via the context's error state
      console.error(err);
    }
  };

  const handleTabChange = (loginState: boolean) => {
    setView(loginState ? 'login' : 'register');
    setRegistrationComplete(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        {registrationComplete ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Registration Successful!</h2>
            <div className="mt-4 text-center text-green-800 bg-green-100 p-4 rounded-md border border-green-200">
              <p className="font-semibold">Please check your email.</p>
              <p className="text-sm mt-1">A confirmation link has been sent to activate your account. You must verify your email before you can log in.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex border-b">
              <button
                onClick={() => handleTabChange(true)}
                className={`w-1/2 py-3 text-lg font-semibold text-center transition-colors duration-300 ${view === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                Login
              </button>
              <button
                onClick={() => handleTabChange(false)}
                className={`w-1/2 py-3 text-lg font-semibold text-center transition-colors duration-300 ${view === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                Register
              </button>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-800">
              {view === 'login' ? 'Welcome Back!' : 'Create an Account'}
            </h2>

            {message && <p className="text-green-600 text-sm text-center bg-green-100 p-3 rounded-md">{message}</p>}
            {error && (
                <p className="text-red-600 text-sm text-center bg-red-100 p-3 rounded-md">
                    {error.includes('Email not confirmed')
                        ? 'Your email has not been confirmed. Please check your inbox for a confirmation link.'
                        : error}
                </p>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-6">
              {view === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>

              {view === 'register' && (
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">I am a</label>
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value={UserRole.STUDENT}>Student</option>
                    <option value={UserRole.FACULTY}>Faculty</option>
                  </select>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed">
                {loading ? 'Processing...' : view === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}