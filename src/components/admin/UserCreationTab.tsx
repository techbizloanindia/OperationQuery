'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/types/shared';

// Notification component
interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full">
      <div className={`backdrop-blur-xl border-2 rounded-2xl shadow-2xl p-6 ${
        type === 'success' 
          ? 'bg-green-500/20 border-green-400/50 text-green-100' 
          : 'bg-red-500/20 border-red-400/50 text-red-100'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {type === 'success' ? (
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm mt-2 opacity-90">{message}</p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex text-white/70 hover:text-white focus:outline-none transition-colors duration-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface User {
  _id?: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  branch: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

interface Branch {
  _id: string;
  branchCode: string;
  branchName: string;
  isActive: boolean;
}

interface EditModalData {
  isOpen: boolean;
  user: User | null;
  type: 'password' | 'details';
}

interface DeleteModalData {
  isOpen: boolean;
  user: User | null;
}

const UserCreationTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editModal, setEditModal] = useState<EditModalData>({ isOpen: false, user: null, type: 'password' });
  const [deleteModal, setDeleteModal] = useState<DeleteModalData>({ isOpen: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'operations' as UserRole,
    selectedBranches: [] as string[]
  });
  const [editSelectAll, setEditSelectAll] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ show: false, type: 'success', title: '', message: '' });

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: 'success', title: '', message: '' });
  };

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '', // Keep for display but not required
    password: '',
    confirmPassword: '',
    role: 'operations' as UserRole,
    selectedBranches: [] as string[]
  });

  const [selectAll, setSelectAll] = useState(false);

  // Fetch users and branches on component mount
  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
      } else {
        console.error('Failed to fetch users:', result.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Get active branch names for the UI
  const activeBranchNames = branches.filter(branch => branch.isActive).map(branch => branch.branchName);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleBranchChange = (branch: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branch)
        ? prev.selectedBranches.filter(b => b !== branch)
        : [...prev.selectedBranches, branch]
    }));
  };

  const handleSelectAllBranches = () => {
    if (selectAll) {
      setFormData(prev => ({ ...prev, selectedBranches: [] }));
    } else {
      setFormData(prev => ({ ...prev, selectedBranches: [...activeBranchNames] }));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showNotification('error', '❌ Validation Error', 'Passwords do not match! Please ensure both password fields are identical.');
      return;
    }
    
    if (!formData.employeeId || !formData.fullName || !formData.email || !formData.password) {
      const missingFields = [];
      if (!formData.employeeId) missingFields.push('Employee ID');
      if (!formData.fullName) missingFields.push('Full Name');
      if (!formData.email) missingFields.push('Email Address');
      if (!formData.password) missingFields.push('Password');
      
      showNotification('error', '📝 Missing Information', `Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (formData.selectedBranches.length === 0) {
      showNotification('error', '🏢 Branch Selection Required', 'Please select at least one branch for the user to access.');
      return;
    }

    try {
      setLoading(true);
      
      // Create user first
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          branch: formData.selectedBranches.length === 1 ? formData.selectedBranches[0] : 'Multiple',
          department: 'General'
        }),
      });

      const userResult = await userResponse.json();
      
      if (userResult.success) {
        // Now assign access rights
        const accessResponse = await fetch('/api/access-rights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userResult.data._id,
            role: formData.role,
            branches: formData.selectedBranches,
            permissions: []
          }),
        });

        const accessResult = await accessResponse.json();
        
        if (accessResult.success) {
          showNotification(
            'success', 
            '🎉 User Created Successfully!', 
            `${formData.fullName} has been created with ${formData.role} role and access to ${formData.selectedBranches.length} branch(es). The user can now log in with Employee ID: ${formData.employeeId}`
          );
          
          // Reset form
          setFormData({
            employeeId: '',
            fullName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role: 'operations',
            selectedBranches: []
          });
          setSelectAll(false);
          
          fetchUsers(); // Refresh the user list
        } else {
          showNotification(
            'error',
            '⚠️ Partial Success',
            `User ${formData.fullName} was created but failed to assign access rights: ${accessResult.error}`
          );
        }
      } else {
        showNotification(
          'error',
          '❌ Failed to Create User',
          `Could not create user ${formData.fullName}: ${userResult.error}`
        );
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while creating the user. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditPasswordModal = (user: User) => {
    setEditModal({ isOpen: true, user, type: 'password' });
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const openEditDetailsModal = async (user: User) => {
    setEditModal({ isOpen: true, user, type: 'details' });
    
    // Load user's current details and branch permissions
    setEditFormData({
      fullName: user.fullName,
      email: user.email,
      phone: '', // Will be loaded from API
      role: user.role as UserRole,
      selectedBranches: []
    });

    // Fetch user's branch permissions
    if (user._id) {
      try {
        const response = await fetch(`/api/users/${user._id}`);
        const result = await response.json();
        if (result.success && result.data.permissions) {
          const branchPermissions = result.data.permissions
            .filter((perm: string) => perm.startsWith('branch:'))
            .map((perm: string) => perm.replace('branch:', ''));
          setEditFormData(prev => ({ ...prev, selectedBranches: branchPermissions }));
        }
      } catch (error) {
        console.error('Error loading user details:', error);
      }
    }
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, user: null, type: 'password' });
    setNewPassword('');
    setConfirmNewPassword('');
    setEditFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'operations',
      selectedBranches: []
    });
    setEditSelectAll(false);
  };

  const openDeleteModal = (user: User) => {
    setDeleteModal({ isOpen: true, user });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, user: null });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      showNotification('error', '❌ Password Mismatch', 'New passwords do not match! Please ensure both password fields are identical.');
      return;
    }

    if (!editModal.user || !editModal.user._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${editModal.user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(
          'success',
          '🔐 Password Updated',
          `Password for ${editModal.user.fullName} has been updated successfully!`
        );
        closeEditModal();
        fetchUsers(); // Refresh the user list
      } else {
        showNotification(
          'error',
          '❌ Password Update Failed',
          `Failed to update password for ${editModal.user.fullName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while updating the password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleEditBranchChange = (branch: string) => {
    setEditFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branch)
        ? prev.selectedBranches.filter(b => b !== branch)
        : [...prev.selectedBranches, branch]
    }));
  };

  const handleEditSelectAllBranches = () => {
    if (editSelectAll) {
      setEditFormData(prev => ({ ...prev, selectedBranches: [] }));
    } else {
      setEditFormData(prev => ({ ...prev, selectedBranches: [...activeBranchNames] }));
    }
    setEditSelectAll(!editSelectAll);
  };

  const handleUserDetailsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editModal.user || !editModal.user._id) return;

    if (editFormData.selectedBranches.length === 0) {
      showNotification('error', '🏢 Branch Selection Required', 'Please select at least one branch for the user to access.');
      return;
    }

    try {
      setLoading(true);
      
      // Update user details
      const userResponse = await fetch(`/api/users/${editModal.user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editFormData.fullName,
          email: editFormData.email,
          role: editFormData.role,
          branch: editFormData.selectedBranches.length === 1 ? editFormData.selectedBranches[0] : 'Multiple',
        }),
      });

      const userResult = await userResponse.json();
      
      if (userResult.success) {
        // Update access rights
        const accessResponse = await fetch('/api/access-rights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editModal.user._id,
            role: editFormData.role,
            branches: editFormData.selectedBranches,
            permissions: []
          }),
        });

        const accessResult = await accessResponse.json();
        
        if (accessResult.success) {
          showNotification(
            'success',
            '✅ User Updated',
            `${editFormData.fullName} has been updated successfully with ${editFormData.role} role and access to ${editFormData.selectedBranches.length} branch(es)!`
          );
          closeEditModal();
          fetchUsers(); // Refresh the user list
        } else {
          showNotification(
            'error',
            '⚠️ Partial Update',
            `User ${editFormData.fullName} was updated but failed to update access rights: ${accessResult.error}`
          );
        }
      } else {
        showNotification(
          'error',
          '❌ Update Failed',
          `Failed to update user ${editFormData.fullName}: ${userResult.error}`
        );
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while updating the user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user || !deleteModal.user._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${deleteModal.user._id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(
          'success',
          '🗑️ User Deleted',
          `${deleteModal.user.fullName} has been permanently deleted from the system.`
        );
        closeDeleteModal();
        fetchUsers(); // Refresh the user list
      } else {
        showNotification(
          'error',
          '❌ Delete Failed',
          `Failed to delete user ${deleteModal.user.fullName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while deleting the user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Modern Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl"></div>
        <div className="relative backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                👤 Create New User Account & Assign Access
              </h3>
              <p className="text-purple-200/90 text-sm font-medium">Simplified user creation with essential details only</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 px-4 py-3 bg-green-500/20 border border-green-400/30 rounded-xl">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-sm text-green-200 font-medium">
              <span className="font-semibold">Streamlined Setup:</span> Create users with just the essential information - Employee ID, Full Name, Email, Phone, and Password
            </p>
          </div>
        </div>
      </div>

      {/* Modern Form Container */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-purple-900/30 rounded-3xl blur-xl"></div>
        <form onSubmit={handleSubmit} className="relative backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
        
        {/* Required Fields Info */}
        <div className="flex items-start space-x-3 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-200 mb-1">Required Information</h4>
            <p className="text-xs text-blue-200/80">
              Fields marked with <span className="text-red-400 font-semibold">*</span> are required. 
              Only Employee ID, Full Name, Email Address, and Password are mandatory for account creation.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="employeeId" className="block text-sm font-semibold text-purple-200 mb-3">
              Employee ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="employeeId"
                id="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Enter employee ID"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-semibold text-purple-200 mb-3">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="fullName"
                id="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Enter full name"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-purple-200 mb-3">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Enter email address"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-semibold text-purple-200 mb-3">
              Phone Number <span className="text-xs text-purple-300/60 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Enter phone number (optional)"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Password Section with Modern Design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-purple-200 mb-3">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-4 pr-12 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-purple-300 hover:text-white transition-colors duration-200"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-purple-200 mb-3">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-4 pr-12 bg-white/10 border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-purple-300 hover:text-white transition-colors duration-200"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Modern Role Selection */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Role Assignment</h3>
              <p className="text-purple-200/80 text-sm">Define the user's role and access permissions</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <label className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              formData.role === 'operations' 
                ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
            }`}>
              <input
                type="radio"
                name="role"
                value="operations"
                checked={formData.role === 'operations'}
                onChange={() => handleRoleChange('operations')}
                className="sr-only"
              />
              <div className="text-2xl mb-2">⚙️</div>
              <span className="text-sm font-semibold text-white">Operations</span>
            </label>
            
            <label className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              formData.role === 'credit' 
                ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
            }`}>
              <input
                type="radio"
                name="role"
                value="credit"
                checked={formData.role === 'credit'}
                onChange={() => handleRoleChange('credit')}
                className="sr-only"
              />
              <div className="text-2xl mb-2">💳</div>
              <span className="text-sm font-semibold text-white">Credit</span>
            </label>
            
            <label className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              formData.role === 'sales' 
                ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
            }`}>
              <input
                type="radio"
                name="role"
                value="sales"
                checked={formData.role === 'sales'}
                onChange={() => handleRoleChange('sales')}
                className="sr-only"
              />
              <div className="text-2xl mb-2">📈</div>
              <span className="text-sm font-semibold text-white">Sales</span>
            </label>
            
            <label className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              formData.role === 'admin' 
                ? 'border-red-400 bg-red-500/20 shadow-lg shadow-red-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
            }`}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={() => handleRoleChange('admin')}
                className="sr-only"
              />
              <div className="text-2xl mb-2">👑</div>
              <span className="text-sm font-semibold text-white">Admin</span>
            </label>
          </div>
        </div>

        {/* Modern Branch Access */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Branch Access</h3>
              <p className="text-purple-200/80 text-sm">Select the branches this user will have access to</p>
            </div>
          </div>
          
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
            {/* Select All Option */}
            <div className="flex items-center justify-between p-4 mb-6 bg-white/10 rounded-xl border border-white/20">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  id="selectAllBranches"
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAllBranches}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="text-sm font-bold text-white">
                  Select All Branches ({activeBranchNames.length} available)
                </span>
              </label>
            </div>

            {/* Modern Branch Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeBranchNames.map((branch) => (
                <label 
                  key={branch} 
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                    formData.selectedBranches.includes(branch)
                      ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedBranches.includes(branch)}
                    onChange={() => handleBranchChange(branch)}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
                  />
                  <span className="ml-3 text-sm text-white font-medium truncate" title={branch}>
                    {branch}
                  </span>
                </label>
              ))}
            </div>

            {/* Selected Count */}
            {formData.selectedBranches.length > 0 && (
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                <p className="text-sm text-blue-200 font-semibold">
                  ✅ {formData.selectedBranches.length} branch{formData.selectedBranches.length !== 1 ? 'es' : ''} selected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modern Summary Section */}
        {formData.fullName && formData.role && formData.selectedBranches.length > 0 && (
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white">User Creation Summary</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-200">Name:</span>
                  <span className="text-white font-semibold">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Employee ID:</span>
                  <span className="text-white font-semibold">{formData.employeeId}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-200">Role:</span>
                  <span className="text-white font-semibold">{formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Branches:</span>
                  <span className="text-white font-semibold">{formData.selectedBranches.length} selected</span>
                </div>
              </div>
            </div>
            {formData.selectedBranches.length > 0 && formData.selectedBranches.length <= 5 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-green-200">
                  <span className="font-semibold">Selected branches:</span> {formData.selectedBranches.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Modern Submit Button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading}
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating User...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create User
              </>
            )}
          </button>
        </div>
      </form>
      </div>

      {/* Modern User List Section */}
      <div className="relative mt-12">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-purple-900/30 rounded-3xl blur-xl"></div>
        <div className="relative backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">User Management</h3>
                <p className="text-purple-200/80 text-sm">Total users: {users.length}</p>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-white font-medium">Loading users...</span>
              </div>
            </div>
          ) : (
            users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">No Users Found</h4>
                <p className="text-purple-200/80">Create your first user to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Employee ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No users created yet
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id || user.employeeId} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 group-hover:text-blue-900">{user.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-blue-800">{user.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 group-hover:text-blue-700">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          user.role === 'admin' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                          user.role === 'operations' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                          user.role === 'sales' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          user.role === 'credit' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          user.role === 'approval' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' :
                          'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-blue-800">{user.branch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          user.isActive 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                            : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditDetailsModal(user)}
                            className="group relative inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          </button>
                          
                          <button
                            onClick={() => openEditPasswordModal(user)}
                            className="group relative inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-lg shadow-md hover:from-amber-600 hover:to-amber-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2l-4.257-2.257A6 6 0 0117 9zm-5 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2m0-4V3a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            Password
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="group relative inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && editModal.type === 'password' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2l-4.257-2.257A6 6 0 0117 9zm-5 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2m0-4V3a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Update Password
                </h3>
                <p className="text-sm text-gray-600">
                  Change password for <span className="font-semibold text-amber-600">{editModal.user?.fullName}</span>
                </p>
              </div>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  placeholder="Enter new password"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  placeholder="Confirm new password"
                  required
                />
              </div>
              
              <div className="pt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-green-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editModal.isOpen && editModal.type === 'details' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Edit User Details
                </h3>
                <p className="text-sm text-gray-600">
                  Update information for <span className="font-semibold text-blue-600">{editModal.user?.fullName}</span>
                </p>
              </div>
            </div>
            <form onSubmit={handleUserDetailsUpdate} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editFullName" className="block text-sm font-bold text-black mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="editFullName"
                    name="fullName"
                    value={editFormData.fullName}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-black bg-white font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="editEmail" className="block text-sm font-bold text-black mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-black bg-white font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Role Assignment</h4>
                <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
                  <div className="flex items-center">
                    <input
                      id="edit-role-ops"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'operations'}
                      onChange={() => handleEditRoleChange('operations')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-ops" className="ml-3 block text-sm font-medium text-gray-700">
                      Operations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-credit"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'credit'}
                      onChange={() => handleEditRoleChange('credit')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-credit" className="ml-3 block text-sm font-medium text-gray-700">
                      Credit
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-sales"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'sales'}
                      onChange={() => handleEditRoleChange('sales')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-sales" className="ml-3 block text-sm font-medium text-gray-700">
                      Sales
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-admin"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'admin'}
                      onChange={() => handleEditRoleChange('admin')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-admin" className="ml-3 block text-sm font-medium text-gray-700">
                      Admin
                    </label>
                  </div>
                </div>
              </div>

              {/* Branch Access */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Branch Access</h4>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  {/* Select All */}
                  <div className="flex items-center mb-4 pb-4 border-b border-gray-300">
                    <input
                      id="editSelectAllBranches"
                      type="checkbox"
                      checked={editSelectAll}
                      onChange={handleEditSelectAllBranches}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="editSelectAllBranches" className="ml-3 text-sm font-bold text-gray-700">
                      Select All ({activeBranchNames.length} branches)
                    </label>
                  </div>

                  {/* Branch Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {activeBranchNames.map((branch) => (
                      <div key={branch} className="flex items-center">
                        <input
                          id={`edit-branch-${branch.toLowerCase().replace(/\s+/g, '')}`}
                          type="checkbox"
                          checked={editFormData.selectedBranches.includes(branch)}
                          onChange={() => handleEditBranchChange(branch)}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label
                          htmlFor={`edit-branch-${branch.toLowerCase().replace(/\s+/g, '')}`}
                          className="ml-3 text-sm text-gray-700 truncate"
                          title={branch}
                        >
                          {branch}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Selected Count */}
                  {editFormData.selectedBranches.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-sm text-cyan-600 font-medium">
                        {editFormData.selectedBranches.length} branch{editFormData.selectedBranches.length !== 1 ? 'es' : ''} selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Update User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              Are you sure you want to permanently delete <span className="font-bold text-red-600">{deleteModal.user?.fullName}</span>? 
              This will remove the user and all associated data from the system.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={loading}
                className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </div>
  );
};

export default UserCreationTab; 