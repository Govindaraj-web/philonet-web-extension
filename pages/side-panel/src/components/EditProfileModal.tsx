import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Mail, BookOpen, FileText, Save, Loader2, Upload } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';
import { philonetAuthStorage } from '../storage/auth-storage';

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(59, 130, 246, 0.3) rgba(17, 24, 39, 0.2);
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(17, 24, 39, 0.2);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.4) 100%);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.6) 0%, rgba(37, 99, 235, 0.6) 100%);
  }
`;

interface UserProfile {
  user_id: string;
  name: string;
  display_name: string;
  email: string;
  display_pic: string;
  bio: string;
  bio_updated_at: string | null;
  education: string[];
  created_at: string;
  updated_at: string;
}

interface AvatarPreset {
  id: number;
  name: string;
  url: string;
  style: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated
}) => {
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState<string[]>([]);
  const [newEducation, setNewEducation] = useState('');
  
  // Profile picture state
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [avatarPresets, setAvatarPresets] = useState<AvatarPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Avatar preset options
  const fetchAvatarPresets = async () => {
    setIsLoadingPresets(true);
    try {
      const token = await getAuthToken();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token;
      }
      
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile/picture/presets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to fetch avatar presets');
      }

      const data = await response.json();
      setAvatarPresets(data.preset_avatars || []);
      
    } catch (err) {
      console.error('Error fetching avatar presets:', err);
      setError('Failed to load avatar presets');
    } finally {
      setIsLoadingPresets(false);
    }
  };

  // Load user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      fetchAvatarPresets();
      // Reset any previous state when opening
      setError('');
      setSuccessMessage('');
      setShowAvatarOptions(false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = await getAuthToken();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token; // Use the same token for Access-Token
      }
      
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      const profileData = data.data;
      
      setProfile(profileData);
      setDisplayName(profileData.display_name || profileData.name);
      setBio(profileData.bio || '');
      setEducation(profileData.education || []);
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = async () => {
    // Use the proper auth storage to get the current token
    return await philonetAuthStorage.getToken();
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = await getAuthToken();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token; // Use the same token for Access-Token
      }
      
      // Update profile (you'll need to create this API endpoint)
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile/updateProfile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: displayName,
          bio: bio,
          education: education
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      // Clear any previous errors
      setError('');
      setSuccessMessage('Profile updated successfully!');
      
      // Update local state
      const updatedProfile = { 
        ...profile, 
        display_name: displayName, 
        name: displayName, // Also set name field for UI consistency
        bio: bio, 
        education: education 
      };
      setProfile(updatedProfile);
      
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCustomImage = async (file: File) => {
    setIsUploadingImage(true);
    setError('');

    try {
      const token = await getAuthToken();
      
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token; // Use the same token for Access-Token
      }

      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile/picture/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_data: base64,
          file_name: file.name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      if (profile) {
        const updatedProfile = { ...profile, display_pic: data.display_pic };
        setProfile(updatedProfile);
        
        if (onProfileUpdated) {
          onProfileUpdated(updatedProfile);
        }
      }
      
      setSuccessMessage('Profile picture updated successfully!');
      setShowAvatarOptions(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload profile picture');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerateAvatar = async (selectedAvatarId: number) => {
    setIsUploadingImage(true);
    setError('');

    try {
      const token = await getAuthToken();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token; // Use the same token for Access-Token
      }
      
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile/picture/presets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          selected_avatar_id: selectedAvatarId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply avatar preset');
      }

      const data = await response.json();
      
      if (profile) {
        const updatedProfile = { ...profile, display_pic: data.display_pic };
        setProfile(updatedProfile);
        
        if (onProfileUpdated) {
          onProfileUpdated(updatedProfile);
        }
      }
      
      setSuccessMessage('Avatar preset applied successfully!');
      setShowAvatarOptions(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error applying avatar preset:', err);
      setError('Failed to apply avatar preset');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsUploadingImage(true);
    setError('');

    try {
      const token = await getAuthToken();
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Access-Token'] = token; // Use the same token for Access-Token
      }
      
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/auth/profile/picture/reset`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to reset profile picture');
      }

      const data = await response.json();
      
      if (profile) {
        const updatedProfile = { ...profile, display_pic: data.display_pic };
        setProfile(updatedProfile);
        
        if (onProfileUpdated) {
          onProfileUpdated(updatedProfile);
        }
      }
      
      setSuccessMessage('Profile picture reset successfully!');
      setShowAvatarOptions(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error resetting profile picture:', err);
      setError('Failed to reset profile picture');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addEducation = () => {
    if (newEducation.trim() && !education.includes(newEducation.trim())) {
      setEducation([...education, newEducation.trim()]);
      setNewEducation('');
    }
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUploadCustomImage(file);
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Inject custom scrollbar styles */}
      <style>{scrollbarStyles}</style>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-philonet-panel/95 backdrop-blur-xl border border-philonet-border/50 rounded-2xl w-full max-w-2xl max-h-[85vh] min-h-[600px] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-philonet-border/30 bg-gradient-to-r from-philonet-panel via-philonet-card to-philonet-panel">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white tracking-wide">Edit Profile</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-lg hover:bg-philonet-border/30 transition-all duration-200 hover:scale-105 group"
              title="Close modal"
            >
              <X className="w-5 h-5 text-philonet-text-muted group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-180px)] custom-scrollbar scroll-smooth">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center mb-4 shadow-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
                <span className="text-philonet-text-muted font-medium">Loading profile...</span>
              </div>
            ) : error && !profile ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-red-400 mb-6 font-medium">{error}</div>
                <Button onClick={fetchProfile} className="px-6 py-3">
                  Try Again
                </Button>
              </div>
            ) : profile ? (
              <div className="p-6 space-y-6">
                {/* Messages - Only show when there are messages */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3 shadow-lg mb-6"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3" />
                      </div>
                      <span className="font-medium">{error}</span>
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm flex items-center gap-3 shadow-lg mb-6"
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Save className="w-3 h-3" />
                      </div>
                      <span className="font-medium">{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Picture Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center shadow-md">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    Profile Picture
                  </h3>
                  
                  <div className="bg-philonet-card/30 rounded-xl p-6 border border-philonet-border/20">
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <img
                          src={profile.display_pic}
                          alt={profile.display_name}
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-philonet-border/50 shadow-xl transition-transform group-hover:scale-105"
                        />
                        {isUploadingImage && (
                          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-philonet-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-philonet-panel">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-3 flex-1">
                        <Button
                          onClick={() => setShowAvatarOptions(!showAvatarOptions)}
                          className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-philonet-blue-500 to-philonet-blue-600 hover:from-philonet-blue-600 hover:to-philonet-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                          disabled={isUploadingImage}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {showAvatarOptions ? 'Hide Options' : 'Change Picture'}
                        </Button>
                        <p className="text-sm text-philonet-text-muted">
                          Upload a custom image or choose from our avatar collection
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Options */}
                  <AnimatePresence>
                    {showAvatarOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="bg-philonet-card/40 backdrop-blur-sm rounded-xl p-6 space-y-6 border border-philonet-border/30 shadow-inner"
                      >
                        <div className="flex gap-3">
                          {/* Temporarily disabled custom upload functionality */}
                          {/* <Button
                            onClick={handleFileSelect}
                            className="px-4 py-3 text-sm flex items-center gap-2 bg-philonet-panel hover:bg-philonet-border/50 border border-philonet-border/50 transition-all"
                            disabled={isUploadingImage}
                          >
                            <Upload className="w-4 h-4" />
                            Upload Custom
                          </Button> */}
                          <Button
                            onClick={handleResetToDefault}
                            className="px-4 py-3 text-sm bg-philonet-panel hover:bg-philonet-border/50 border border-philonet-border/50 transition-all"
                            disabled={isUploadingImage}
                          >
                            Reset Default
                          </Button>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-philonet-blue-500"></div>
                            Avatar Gallery
                          </h4>
                          {isLoadingPresets ? (
                            <div className="flex flex-col items-center justify-center py-12">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center mb-3 shadow-lg">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              </div>
                              <span className="text-philonet-text-muted font-medium">Loading avatars...</span>
                            </div>
                          ) : avatarPresets.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                              {avatarPresets.map((preset) => (
                                <motion.button
                                  key={preset.id}
                                  onClick={() => handleGenerateAvatar(preset.id)}
                                  disabled={isUploadingImage}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="p-4 text-left bg-philonet-panel/70 hover:bg-philonet-border/40 rounded-xl border border-philonet-border/30 transition-all disabled:opacity-50 flex items-center gap-4 group hover:shadow-lg"
                                >
                                  <img
                                    src={preset.url}
                                    alt={preset.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-philonet-border/30 shadow-md group-hover:shadow-lg transition-shadow"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white text-sm truncate group-hover:text-philonet-blue-300 transition-colors">{preset.name}</div>
                                    <div className="text-xs text-philonet-text-muted capitalize mt-1">{preset.style} style</div>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-philonet-text-muted">
                              <div className="w-16 h-16 rounded-full bg-philonet-border/20 flex items-center justify-center mx-auto mb-3">
                                <Camera className="w-8 h-8 text-philonet-text-muted" />
                              </div>
                              No avatar presets available
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    Basic Information
                  </h3>
                  
                  <div className="bg-philonet-card/30 rounded-xl p-6 border border-philonet-border/20 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-philonet-blue-500"></div>
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-philonet-panel border border-philonet-border/50 rounded-xl px-4 py-4 text-white placeholder:text-philonet-text-subtle focus:outline-none focus:border-philonet-blue-500 focus:ring-2 focus:ring-philonet-blue-500/20 transition-all shadow-sm"
                        placeholder="Enter your display name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-philonet-text-muted"></div>
                        Email Address
                      </label>
                      <div className="w-full bg-philonet-panel/50 border border-philonet-border/30 rounded-xl px-4 py-4 text-philonet-text-muted flex items-center gap-3 shadow-inner">
                        <Mail className="w-4 h-4 text-philonet-blue-400" />
                        <span className="font-medium">{profile.email}</span>
                        <span className="ml-auto text-xs bg-philonet-border/30 px-2 py-1 rounded-full">Read-only</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center shadow-md">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    About You
                  </h3>
                  
                  <div className="bg-philonet-card/30 rounded-xl p-6 border border-philonet-border/20">
                    <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-philonet-blue-500"></div>
                      Bio
                    </label>
                    <div className="relative">
                      <Textarea
                        value={bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
                        rows={4}
                        maxLength={500}
                        className="w-full bg-philonet-panel border border-philonet-border/50 rounded-xl px-4 py-4 text-white placeholder:text-philonet-text-subtle focus:outline-none focus:border-philonet-blue-500 focus:ring-2 focus:ring-philonet-blue-500/20 transition-all shadow-sm resize-none"
                        placeholder="Tell us about yourself, your interests, background..."
                      />
                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-philonet-text-muted">
                          Share something interesting about yourself
                        </div>
                        <div className={`text-xs font-medium ${bio.length > 450 ? 'text-orange-400' : bio.length > 400 ? 'text-yellow-400' : 'text-philonet-text-muted'}`}>
                          {bio.length}/500
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Education Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center shadow-md">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    Education & Background
                  </h3>
                  
                  <div className="bg-philonet-card/30 rounded-xl p-6 border border-philonet-border/20 space-y-6">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {education.map((edu, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-4 bg-philonet-panel/70 rounded-xl px-4 py-4 border border-philonet-border/30 group hover:bg-philonet-border/20 transition-all"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-philonet-blue-500/20 to-philonet-blue-600/20 flex items-center justify-center border border-philonet-blue-500/30">
                              <BookOpen className="w-4 h-4 text-philonet-blue-400" />
                            </div>
                            <span className="flex-1 text-white font-medium">{edu}</span>
                            <button
                              onClick={() => removeEducation(index)}
                              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                              title="Remove education"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {education.length === 0 && (
                        <div className="text-center py-8 text-philonet-text-muted">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-philonet-text-muted/50" />
                          <p className="font-medium">No education added yet</p>
                          <p className="text-sm">Add your educational background below</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newEducation}
                        onChange={(e) => setNewEducation(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEducation()}
                        className="flex-1 bg-philonet-panel border border-philonet-border/50 rounded-xl px-4 py-4 text-white placeholder:text-philonet-text-subtle focus:outline-none focus:border-philonet-blue-500 focus:ring-2 focus:ring-philonet-blue-500/20 transition-all shadow-sm"
                        placeholder="University, degree, certification..."
                      />
                      <Button
                        onClick={addEducation}
                        className="px-6 py-4 text-sm font-medium bg-philonet-blue-500 hover:bg-philonet-blue-600 transition-all shadow-lg"
                        disabled={!newEducation.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer - Fixed position to prevent scrolling issues */}
          {profile && (
            <div className="sticky bottom-0 bg-gradient-to-t from-philonet-panel via-philonet-panel to-transparent border-t border-philonet-border/30 backdrop-blur-xl">
              <div className="flex items-center justify-between p-6">
                <div className="text-sm text-philonet-text-muted">
                  Changes will be saved to your profile
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={onClose}
                    className="px-6 py-3 bg-transparent border border-philonet-border/50 hover:bg-philonet-border/20 text-philonet-text-muted hover:text-white transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving || !displayName.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-philonet-blue-500 to-philonet-blue-600 hover:from-philonet-blue-600 hover:to-philonet-blue-700 border-philonet-blue-500 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
};

export default EditProfileModal;
