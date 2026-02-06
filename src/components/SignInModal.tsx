import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const payload = isSignUp 
        ? { username, email, password }
        : { email, password };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log(isSignUp ? 'Account created!' : 'Signed in!', data.user);
      
      // Clear form
      setEmail('');
      setPassword('');
      setUsername('');
      
      // Close modal on success
      onClose();
      
      setIsLoading(false);
    } catch (err) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-100 dark:from-gray-900 to-white dark:to-black rounded-2xl w-full max-w-md border border-gray-300 dark:border-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 border border-red-400 dark:border-red-500 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input - Only for Sign Up */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose your username"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
            <span className="text-xs text-gray-600 dark:text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button className="w-full py-2.5 px-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-semibold rounded-lg transition-colors border border-gray-300 dark:border-gray-700">
              Continue with Google
            </button>
            <button className="w-full py-2.5 px-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-semibold rounded-lg transition-colors border border-gray-300 dark:border-gray-700">
              Continue with GitHub
            </button>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center pt-2">
            <p className="text-gray-700 dark:text-gray-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setUsername('');
                  setEmail('');
                  setPassword('');
                }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 font-semibold hover:opacity-80 transition-opacity"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {/* Forgot Password */}
          {!isSignUp && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
