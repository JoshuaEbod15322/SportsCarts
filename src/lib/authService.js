import { supabase } from "./supabase";

export const authService = {
  // Get current authenticated user - with improved error handling
  getCurrentUser: async () => {
    try {
      // First, check if we have a valid session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.warn("Session check error:", sessionError);
        // Clear any invalid session data
        localStorage.removeItem("supabase.auth.token");
        return null;
      }

      if (!sessionData.session) {
        // No active session found
        return null;
      }

      // Now get the user with the valid session
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn("Error getting user:", error);
        // Try to refresh the session if it's expired
        if (error.message.includes("Auth session missing")) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn("Session refresh failed:", refreshError);
            localStorage.removeItem("supabase.auth.token");
            return null;
          }

          if (refreshData.session) {
            // Retry getting user with refreshed session
            const retryUser = await supabase.auth.getUser();
            if (!retryUser.error && retryUser.data.user) {
              return retryUser.data.user;
            }
          }
        }
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Get user profile from users table
  getUserProfile: async (userId) => {
    try {
      if (!userId) {
        console.warn("No userId provided to getUserProfile");
        return null;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.warn(
            "User profile not found in users table for userId:",
            userId
          );
          // User exists in auth but not in users table
          // This could happen with old users - we should create a profile
          return await authService.createUserProfile(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  // Create user profile if it doesn't exist
  createUserProfile: async (userId) => {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      if (!authUser || !authUser.user) {
        console.error("Auth user not found for userId:", userId);
        return null;
      }

      const userData = {
        id: userId,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_admin: false,
      };

      const { data, error } = await supabase
        .from("users")
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error("Error creating user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createUserProfile:", error);
      return null;
    }
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      if (!userId) {
        throw new Error("userId is required to update profile");
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  // Check if user is admin
  isAdmin: async (userId) => {
    try {
      if (!userId) return false;

      const profile = await authService.getUserProfile(userId);
      if (!profile) return false;

      return profile.is_admin === true;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  },

  // Sign in
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please try again.");
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error(
            "Please confirm your email address before signing in."
          );
        }
        throw new Error(`Login failed: ${error.message}`);
      }

      // Ensure user profile exists in users table
      if (data.user) {
        const existingProfile = await authService.getUserProfile(data.user.id);
        if (!existingProfile) {
          console.log("Creating user profile for new sign-in...");
          await authService.createUserProfile(data.user.id);
        }
      }

      return data;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  },

  // Sign up
  signUp: async (email, password, fullName) => {
    try {
      if (!email || !password || !fullName) {
        throw new Error("All fields are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error(
            "An account with this email already exists. Please sign in instead."
          );
        }
        throw new Error(`Signup failed: ${error.message}`);
      }

      // For development - auto sign in after signup
      if (data.user && !data.user.email_confirmed_at) {
        console.log("Auto-logging in new user for development...");

        // Create user profile immediately
        await authService.createUserProfile(data.user.id);

        const signInResult = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInResult.error) {
          console.warn("Auto-login failed:", signInResult.error);
        } else {
          data.user = signInResult.data.user;
          data.session = signInResult.data.session;
        }
      }

      return data;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      // Clear local storage first
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("supabase.auth.refreshToken");

      const { error } = await supabase.auth.signOut();

      // Clear session storage too
      sessionStorage.clear();

      if (error) {
        console.warn("Supabase sign out error:", error);
        // Even if supabase fails, we've cleared local storage
      }

      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      // Force clear storage on error
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("supabase.auth.refreshToken");
      sessionStorage.clear();
      return { success: true };
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const user = await authService.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  },

  // Get session for debugging
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("Error getting session:", error);
        return null;
      }
      return data.session;
    } catch (error) {
      console.error("Error in getSession:", error);
      return null;
    }
  },
};
