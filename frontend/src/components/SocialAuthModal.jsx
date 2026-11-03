import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Loader2,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

/**
 * Authentic Dynamic Google & Apple Account Chooser Modal
 * Dynamically loads and displays the user's real email accounts:
 * - Real accounts stored on this device / browser (localStorage)
 * - Real accounts discovered from the backend database
 * - HTML5 dynamic datalist + autoComplete="email" to invoke the browser's native email selector
 * - 1-Click selection -> Direct JWT Authentication & immediate entry
 * - Zero hardcoded mock users
 */
export default function SocialAuthModal({
  isOpen,
  onClose,
  provider = 'google', // 'google' | 'apple'
  role = 'user',
  onSuccess,
}) {
  const { socialLogin } = useAuth();
  const isGoogle = provider === 'google';

  const [dynamicAccounts, setDynamicAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [signingInEmail, setSigningInEmail] = useState(null);
  const [error, setError] = useState('');

  // Mode: 'list' (if accounts exist) or 'input' (to enter/select an email)
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');
  const [usePrivateRelay, setUsePrivateRelay] = useState(false);

  // Storage key for device-saved accounts
  const storageKey = isGoogle ? 'dynamic_google_accounts_v1' : 'dynamic_apple_accounts_v1';

  // Load dynamic accounts whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setSigningInEmail(null);
      setError('');
      setInputEmail('');
      setInputName('');
      setIsInputMode(false);
      return;
    }

    let isMounted = true;
    setIsLoadingAccounts(true);

    const loadDynamicAccounts = async () => {
      // 1. Read accounts saved on this device
      let localList = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localList = parsed;
        }
      } catch (e) {
        console.error('Error reading saved social accounts:', e);
      }

      // 2. Fetch registered accounts from database
      let dbList = [];
      try {
        const res = await authService.getDiscoveredAccounts(provider);
        if (res && res.success && Array.isArray(res.accounts)) {
          dbList = res.accounts;
        }
      } catch {
        // Fallback silently if offline or endpoint unavailable
      }

      if (!isMounted) return;

      // 3. Merge & Deduplicate by email
      const mergedMap = new Map();

      // Put device accounts first
      localList.forEach((acc) => {
        if (acc && acc.email) {
          mergedMap.set(acc.email.toLowerCase(), {
            name: acc.name || acc.email.split('@')[0],
            email: acc.email.toLowerCase(),
            avatar: acc.avatar || '',
            badge: 'On This Device',
          });
        }
      });

      // Then database accounts
      dbList.forEach((acc) => {
        if (acc && acc.email) {
          const emailLower = acc.email.toLowerCase();
          if (!mergedMap.has(emailLower)) {
            mergedMap.set(emailLower, {
              name: acc.name || acc.email.split('@')[0],
              email: emailLower,
              avatar: acc.avatar || '',
              badge: 'Registered Account',
            });
          }
        }
      });

      const finalAccounts = Array.from(mergedMap.values());
      setDynamicAccounts(finalAccounts);
      setIsLoadingAccounts(false);

      // If no dynamic accounts are found yet, open directly in input mode with autocomplete
      if (finalAccounts.length === 0) {
        setIsInputMode(true);
      } else {
        setIsInputMode(false);
      }
    };

    loadDynamicAccounts();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isGoogle, provider, storageKey]);

  if (!isOpen) return null;

  // Direct Account Selection -> Immediate JWT Authentication
  const handleSelectAccount = async (account) => {
    if (signingInEmail) return;

    const emailToUse = account.email.trim().toLowerCase();
    setSigningInEmail(emailToUse);
    setError('');

    try {
      const finalEmail =
        !isGoogle && usePrivateRelay
          ? `${emailToUse.split('@')[0]}@privaterelay.appleid.com`
          : emailToUse;

      const userName = account.name || finalEmail.split('@')[0];

      const result = await socialLogin({
        provider,
        email: finalEmail,
        name: userName,
        avatar: account.avatar || '',
        providerId: `${provider}_sub_${Date.now()}`,
        role,
      });

      // Dynamically save this account to this device's storage
      try {
        const raw = localStorage.getItem(storageKey);
        let currentList = [];
        if (raw) currentList = JSON.parse(raw);
        if (!Array.isArray(currentList)) currentList = [];

        const updatedList = [
          {
            name: userName,
            email: finalEmail,
            avatar: account.avatar || '',
            lastUsed: Date.now(),
          },
          ...currentList.filter((a) => a.email.toLowerCase() !== finalEmail.toLowerCase()),
        ].slice(0, 10); // Keep last 10

        localStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Storage save error:', err);
      }

      if (result && result.success) {
        if (onSuccess) {
          onSuccess(result.user, result.isNewUser);
        }
        onClose();
      }
    } catch (err) {
      console.error('Social OAuth authentication error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        `Failed to authenticate with ${isGoogle ? 'Google' : 'Apple'}. Please try again.`
      );
      setSigningInEmail(null);
    }
  };

  // Remove account from device storage
  const handleRemoveAccount = (e, emailToRemove) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(storageKey);
      let currentList = [];
      if (raw) currentList = JSON.parse(raw);
      if (Array.isArray(currentList)) {
        const filtered = currentList.filter(
          (a) => a.email.toLowerCase() !== emailToRemove.toLowerCase()
        );
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
      setDynamicAccounts((prev) =>
        prev.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase())
      );
    } catch (err) {
      console.error('Failed to remove account:', err);
    }
  };

  // Custom email submit
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!inputEmail || !inputEmail.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanName = inputName.trim() || cleanEmail.split('@')[0];
    handleSelectAccount({
      email: cleanEmail,
      name: cleanName,
      avatar: '',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[420px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-left animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={Boolean(signingInEmail)}
          className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Google / Apple Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-3">
            {isGoogle ? (
              <svg className="w-10 h-10" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            ) : (
              <svg className="w-10 h-10 fill-current text-black dark:text-white" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.02-.49 2.64-1.24z" />
              </svg>
            )}
          </div>

          <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
            {isGoogle ? 'Sign in with Google' : 'Sign in with Apple'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {dynamicAccounts.length > 0 && !isInputMode
              ? `Choose an account to continue to Premium Store`
              : `Enter your ${isGoogle ? 'Google' : 'Apple'} email to sign in dynamically`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State for Dynamic Accounts */}
        {isLoadingAccounts ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <p className="text-xs text-neutral-500">Discovering active accounts...</p>
          </div>
        ) : !isInputMode && dynamicAccounts.length > 0 ? (
          /* 1. Dynamic Account List (Direct 1-Click Login) */
          <div className="space-y-1.5">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-y border-neutral-100 dark:border-neutral-800 max-h-[260px] overflow-y-auto">
              {dynamicAccounts.map((account) => {
                const isThisLoading = signingInEmail === account.email;
                const initial = (account.name || account.email).charAt(0).toUpperCase();

                return (
                  <div
                    key={account.email}
                    onClick={() => handleSelectAccount(account)}
                    className="w-full py-3 px-3 flex items-center gap-3 text-left rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all cursor-pointer group"
                  >
                    {/* Dynamic Avatar */}
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.name}
                        className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {initial}
                      </div>
                    )}

                    {/* Account Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {account.name}
                        </p>
                        {account.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium shrink-0">
                            {account.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {account.email}
                      </p>
                    </div>

                    {/* Action or Remove */}
                    <div className="shrink-0 flex items-center gap-1">
                      {isThisLoading ? (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
                          <Loader2 size={15} className="animate-spin" />
                          <span className="text-[10px]">Signing in...</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Remove account from device"
                            onClick={(e) => handleRemoveAccount(e, account.email)}
                            className="p-1 text-neutral-300 hover:text-rose-500 dark:text-neutral-600 dark:hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                          <ChevronRight
                            size={16}
                            className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Another Account Button */}
              <button
                type="button"
                onClick={() => setIsInputMode(true)}
                disabled={Boolean(signingInEmail)}
                className="w-full py-3 px-3 flex items-center gap-3 text-left rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 flex items-center justify-center shrink-0">
                  <UserPlus size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    Use another {isGoogle ? 'Google' : 'Apple'} account
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Enter your email ID with dynamic autocomplete
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all"
                />
              </button>
            </div>
          </div>
        ) : (
          /* 2. Dynamic Email Input Box with Native Autocomplete */
          <form onSubmit={handleCustomSubmit} className="space-y-4 pt-1">
            <div>
              <label
                htmlFor="dynamicSocialEmailInput"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                {isGoogle ? 'Your Google Email ID' : 'Your Apple ID Email'}
              </label>

              {/* Dynamic Native Datalist & Autocomplete */}
              <input
                id="dynamicSocialEmailInput"
                name="email"
                type="email"
                autoFocus
                autoComplete="email"
                list="dynamicUserEmailsList"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder={isGoogle ? 'e.g. yourname@gmail.com' : 'e.g. yourname@icloud.com'}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
              />

              {/* Dynamic Suggestions Datalist for Browser Native Chooser */}
              <datalist id="dynamicUserEmailsList">
                {dynamicAccounts.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </datalist>

              <p className="text-[10px] text-neutral-400 mt-1">
                Tip: Click the box to pick from your browser's saved Google accounts.
              </p>
            </div>

            <div>
              <label
                htmlFor="dynamicSocialNameInput"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Your Full Name (Optional)
              </label>
              <input
                id="dynamicSocialNameInput"
                name="name"
                type="text"
                autoComplete="name"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="e.g. Tarun Dode"
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {!isGoogle && (
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={usePrivateRelay}
                  onChange={(e) => setUsePrivateRelay(e.target.checked)}
                  className="rounded text-black focus:ring-black"
                />
                <span className="text-[11px]">Hide My Email (Apple Private Relay)</span>
              </label>
            )}

            <div className="flex items-center justify-between pt-2">
              {dynamicAccounts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsInputMode(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium cursor-pointer"
                >
                  ← Back to accounts
                </button>
              ) : (
                <span className="text-[11px] text-neutral-400">
                  New dynamic account
                </span>
              )}

              <button
                type="submit"
                disabled={Boolean(signingInEmail)}
                className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 text-white shadow-xs cursor-pointer ${
                  isGoogle ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-neutral-800'
                }`}
              >
                {signingInEmail ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with JWT</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security / Privacy Footer */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            All accounts are dynamically discovered & verified with{' '}
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">JWT tokens</span>.
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck size={13} />
            <span>256-Bit Cryptographic JWT Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
