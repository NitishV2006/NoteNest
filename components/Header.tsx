
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpenIcon } from './Icons';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // Successful logout will trigger onAuthStateChange, which handles state.
      // We can safely navigate home.
      navigate('/'); 
    } catch (error) {
      console.error('Logout failed:', error);
      // If logout fails, show an alert and keep the user on the current page.
      alert('Logout failed. Please check your connection and try again.');
    }
  };

  const activeLinkClass = "bg-blue-700 text-white";
  const inactiveLinkClass = "text-white hover:bg-blue-500 hover:bg-opacity-75";
  const linkBaseClass = "px-3 py-2 rounded-md text-sm font-medium";

  return (
    <header className="bg-blue-600 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 flex items-center text-white">
              <BookOpenIcon className="h-8 w-8" />
              <span className="ml-3 text-xl font-bold">Note Nest</span>
            </NavLink>
          </div>
          <nav className="flex items-center space-x-2 md:space-x-4">
            {user ? (
              <>
                <span className="text-blue-100 text-sm hidden sm:block truncate max-w-xs">Welcome, {user.name || user.email}</span>
                <NavLink 
                  to="/dashboard"
                  className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                >
                  Dashboard
                </NavLink>
                <NavLink 
                  to="/profile"
                  className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                >
                  Profile
                </NavLink>
                <button
                  onClick={handleLogout}
                  className={`${linkBaseClass} ${inactiveLinkClass}`}
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink 
                to="/login"
                className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                Login / Register
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
