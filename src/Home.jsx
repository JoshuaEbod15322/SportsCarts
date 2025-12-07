import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "./lib/authService";
import "./App.css";

function Home() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const openAuthModal = (mode = "login") => {
    setIsLoginMode(mode === "login");
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setAuthForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setAuthError("");
  };

  const handleAuthChange = (e) => {
    setAuthForm({
      ...authForm,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const isAdmin = await authService.isAdmin(user.id);

        if (isAdmin) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    try {
      if (isLoginMode) {
        const { user } = await authService.signIn(
          authForm.email,
          authForm.password
        );
        if (user) {
          closeAuthModal();

          // Check admin status
          const isAdmin = await authService.isAdmin(user.id);

          if (isAdmin) {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          setAuthError("Passwords do not match");
          return;
        }

        const { user } = await authService.signUp(
          authForm.email,
          authForm.password,
          authForm.fullName
        );

        if (user) {
          closeAuthModal();
          // New users go to dashboard (not admin unless manually set in trigger)
          navigate("/dashboard");
        }
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="page font-sans text-gray-900">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeAuthModal}
          />

          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/20">
            <div className="border-b border-gray-200/50 px-6 py-4 bg-gradient-to-r from-white/80 to-white/60">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isLoginMode ? "Welcome Back" : "Create Account"}
                </h2>
                <button
                  onClick={closeAuthModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
                >
                  &times;
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                {isLoginMode
                  ? "Sign in to your account to continue shopping"
                  : "Join SportTumbler PH for exclusive offers"}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="px-6 py-6 bg-white/50">
              {authError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {authError}
                </div>
              )}

              {!isLoginMode && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={authForm.fullName}
                    onChange={handleAuthChange}
                    className="w-full px-4 py-3 border border-gray-300/80 bg-white/90 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/80 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  className="w-full px-4 py-3 border border-gray-300/80 bg-white/90 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/80 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  className="w-full px-4 py-3 border border-gray-300/80 bg-white/90 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/80 focus:border-transparent transition-all"
                  placeholder={
                    isLoginMode ? "Enter your password" : "Create a password"
                  }
                  minLength="6"
                  required
                />
              </div>

              {!isLoginMode && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={authForm.confirmPassword}
                    onChange={handleAuthChange}
                    className="w-full px-4 py-3 border border-gray-300/80 bg-white/90 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/80 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                    minLength="6"
                    required
                  />
                </div>
              )}

              {isLoginMode && (
                <div className="text-right mb-4">
                  <button
                    type="button"
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {!isLoginMode && (
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded text-orange-600 focus:ring-orange-500"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the{" "}
                      <button
                        type="button"
                        className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
                      >
                        Terms & Conditions
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
                      >
                        Privacy Policy
                      </button>
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                {isLoginMode ? "Sign In" : "Create Account"}
              </button>

              <div className="mt-6 text-center">
                <p className="text-gray-700">
                  {isLoginMode
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setAuthError("");
                    }}
                    className="text-orange-600 hover:text-orange-800 font-semibold transition-colors"
                  >
                    {isLoginMode ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="nav">
        <a className="brand text-xl font-bold" href="/">
          DrinksCarts
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm absolute left-1/2 transform -translate-x-1/2">
          <a
            href="#about"
            className="group relative px-4 py-2 font-medium text-gray-700 overflow-hidden rounded-lg transition-all duration-300"
          >
            <span className="relative flex items-center justify-center gap-2">
              About
            </span>
          </a>
        </nav>

        <div className="ml-auto">
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="login px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="login px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <main className="hero">
        <div className="hero-overlay" />
        <div className="hero-content max-w-4xl mx-auto text-center px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Sport Tumbler — Philippines
          </h1>
          <p className="lead mt-4 text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Durable. Leak-proof. Keeps drinks cold for 24 hours and hot for 12.
            Designed for athletes and everyday adventures across the
            Philippines.
          </p>
          <div className="mt-6">
            {currentUser ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="cta inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold hover:from-orange-500 hover:to-orange-700 transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => openAuthModal("signup")}
                className="cta inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold hover:from-orange-500 hover:to-orange-700 transition-all"
              >
                Shop Now
              </button>
            )}
          </div>
        </div>
      </main>

      <section id="about" className="about py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-6">About SportTumbler PH</h2>

            <div className="space-y-6 text-gray-700">
              <p className="text-lg leading-relaxed">
                At DrinksCarts, we are dedicated to connecting you with the best
                high-performance insulated drinkware, designed to meet the
                active Filipino lifestyle. We carefully select brands, like
                SportTumbler PH, that combine superior thermal technology with
                durable, practical design. Our mission is to help you find
                tumblers that withstand the rigors of daily use—from intense
                workouts to outdoor adventures across the archipelago. We
                understand the unique needs of athletes, fitness enthusiasts,
                and active individuals seeking reliable hydration solutions.
              </p>

              <p className="text-lg leading-relaxed">
                The products you'll find on DrinksCarts are engineered for
                excellence, featuring double-wall vacuum insulation to maintain
                optimal temperatures—keeping beverages ice-cold for up to 24
                hours or piping hot for 12 hours. With features like leak-proof
                lids for spill-free transport and durable stainless-steel
                construction, we partner with trusted international brands and
                local manufacturers to bring you a collection where quality
                exceeds expectations. DrinksCarts is your preferred destination
                for discovering hydration gear that delivers on performance,
                reliability, and style.
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => openAuthModal("signup")}
                className="cta inline-block px-6 py-3 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-lg"
              >
                Explore Our Collection
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            © {new Date().getFullYear()} SportTumbler PH —
            <a
              className="owner ml-2 font-medium text-gray-900"
              href="https://example.com/your-social"
              target="_blank"
              rel="noreferrer noopener"
            >
              Joshua E. Ebod
            </a>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <a
              href="https://facebook.com/your-profile"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-blue-600"
            >
              Facebook
            </a>
            <a
              href="https://instagram.com/your-profile"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-pink-600"
            >
              Instagram
            </a>
            <a
              href="mailto:contact@sporttumbler.ph"
              className="hover:text-red-600"
            >
              Email
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
