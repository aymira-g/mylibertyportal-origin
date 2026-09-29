import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { normalizeRole } from "./roles";

/**
 * useUserProfile
 * Centralized, reactive subscription hook for the current authenticated user
 * and their live Firestore profile document (users/{uid}).
 *
 * Guarantees that:
 * - Profile changes (e.g. role updates, branch reassignments) react in real-time.
 * - Roles are normalized to canonical lowercase representations.
 * - Firestore snapshot listeners are cleanly torn down on user sign-out or component unmount.
 * - No untracked async promises or unmounted state updates occur.
 *
 * @returns {{
 *   user: import("firebase/auth").User | null,
 *   profile: Record<string, any> | null,
 *   role: string | null,
 *   branchId: string | null,
 *   branch: string | null,
 *   loading: boolean
 * }}
 */
export function useUserProfile() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(auth.currentUser));

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      // Clean up previous profile listener if auth state switches
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(authUser);

      if (authUser) {
        unsubProfile = onSnapshot(
          doc(db, "users", authUser.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile({ id: snap.id, ...snap.data() });
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error("[useUserProfile] Error loading profile document:", err);
            setProfile(null);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubProfile) {
        unsubProfile();
      }
      unsubAuth();
    };
  }, []);

  const role = normalizeRole(profile?.role) || null;
  const branchId = profile?.branchId || null;
  const branch = profile?.branch || null;

  return {
    user,
    profile,
    role,
    branchId,
    branch,
    loading,
  };
}

export default useUserProfile;
