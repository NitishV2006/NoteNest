import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole, Department } from '../types';
import * as api from '../services/api';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  
  // State for profile details
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', mobile_number: '', department_id: '', subject_taught: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // State for password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        mobile_number: user.mobile_number || '',
        department_id: user.department_id || '',
        subject_taught: user.subject_taught || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const fetchedDepartments = await api.getDepartments();
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        setErrorMessage("Could not load departments due to a server issue. Please contact an administrator.");
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const dataToUpdate = {
        ...formData,
        department_id: formData.department_id || null,
      };
      await updateProfile(dataToUpdate);
      setSuccessMessage('Profile details updated successfully!');
    } catch (err) {
      console.error("Profile update failed:", err);
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await api.updateUserPassword(newPassword);
      setPasswordSuccessMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error("Password update failed:", err);
      setPasswordErrorMessage('Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md divide-y divide-gray-200">
      <div className="pb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>
        
        {successMessage && <div className="mb-4 p-3 text-green-800 bg-green-100 border border-green-200 rounded-md">{successMessage}</div>}
        {errorMessage && <div className="mb-4 p-3 text-red-800 bg-red-100 border border-red-200 rounded-md">{errorMessage}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input id="email" type="email" value={user.email} disabled className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" />
          </div>
          <div>
            <label htmlFor="mobile_number" className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <input id="mobile_number" name="mobile_number" type="tel" value={formData.mobile_number || ''} onChange={handleChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
          </div>
          <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-gray-700">Department</label>
              <select id="department_id" name="department_id" value={formData.department_id || ''} onChange={handleChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
                  <option value="">Select Department</option>
                  {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
          </div>
          {user.role === UserRole.FACULTY && (
            <div>
              <label htmlFor="subject_taught" className="block text-sm font-medium text-gray-700">Subject Taught</label>
              <input id="subject_taught" name="subject_taught" type="text" value={formData.subject_taught || ''} onChange={handleChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
            </div>
          )}
          <div>
            <button type="submit" disabled={isUpdating} className="w-full py-2 px-4 text-white bg-blue-600 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-300">
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="pt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Change Password</h3>
        
        {passwordSuccessMessage && <div className="mb-4 p-3 text-green-800 bg-green-100 border border-green-200 rounded-md">{passwordSuccessMessage}</div>}
        {passwordErrorMessage && <div className="mb-4 p-3 text-red-800 bg-red-100 border border-red-200 rounded-md">{passwordErrorMessage}</div>}

        <form onSubmit={handlePasswordChangeSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
            <input 
              id="newPassword" 
              name="newPassword" 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" 
            />
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" 
            />
          </div>
          <div>
            <button type="submit" disabled={isUpdatingPassword} className="w-full py-2 px-4 text-white bg-gray-700 rounded-md font-semibold hover:bg-gray-800 disabled:bg-gray-400">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}