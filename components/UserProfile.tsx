import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Loader2, Settings } from 'lucide-react';
import { getCurrentUser, signOut } from '../utils/supabase/client';

interface UserProfileProps {
  onNavigateToLogin: () => void;
  onNavigateToAccount?: () => void;
}

export function UserProfile({ onNavigateToLogin, onNavigateToAccount }: UserProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setShowMenu(false);
      onNavigateToLogin();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNavigateToLogin}
        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-all border border-white/20"
      >
        登录
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowMenu(!showMenu)}
        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-all border border-white/20 flex items-center gap-2"
      >
        <User className="w-3.5 h-3.5" />
        <span className="truncate flex-1 text-left">
          {user.user_metadata?.name || user.email?.split('@')[0] || '用户'}
        </span>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-[9999]"
          >
            <div className="p-3 border-b border-white/10">
              <p className="text-white text-xs truncate">
                {user.email}
              </p>
            </div>
            {onNavigateToAccount && (
              <button
                onClick={() => {
                  onNavigateToAccount();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-white hover:bg-white/5 text-xs flex items-center gap-2 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>账户设置</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-red-400 hover:bg-white/5 text-xs flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
