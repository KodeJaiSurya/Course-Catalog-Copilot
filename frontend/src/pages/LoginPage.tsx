import Fuse from "fuse.js";
import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  Zap,
  Shield,
  Check,
  ArrowLeft,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 fields
  const [degree, setDegree] = useState("");
  const [course, setCourse] = useState("");
  const [coursesTaken, setCoursesTaken] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [availableCourses, setAvailableCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const searchRef = useRef(null);
  const [fuse, setFuse] = useState(null);

  // Normalize backend response into string[] of titles
  const normalizeCourseData = (data) => {
    if (!data) return [];
    // Case A: data is an array of strings
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      return data;
    }
    // Case B: { titles: [...] }
    if (data && Array.isArray(data.titles)) {
      return data.titles;
    }
    // Case C: array of objects with .title (or name)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
      // try common keys
      const key = data[0].title ? "title" : data[0].name ? "name" : null;
      if (key) {
        return data.map((d) => d[key]).filter(Boolean);
      }
      // fallback: try to stringify each object (not ideal)
      console.warn(
        "[normalizeCourseData] unexpected object shape for cleaned_titles; falling back to JSON strings"
      );
      return data.map((d) => JSON.stringify(d));
    }

    // unknown shape fallback
    console.warn("[normalizeCourseData] unexpected response shape", data);
    return [];
  };

  // Fetch courses from API and initialize Fuse
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cleaned_titles`);
        if (!response.ok) throw new Error("Failed to fetch courses");

        const data = await response.json();
        const titles = normalizeCourseData(data);
        setAvailableCourses(titles);

        // initialize Fuse with array of strings
        const fuseInstance = new Fuse(titles, {
          threshold: 0.35,
          minMatchCharLength: 2,
        });
        setFuse(fuseInstance);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    fetchCourses();
  }, []);

  // Close suggestions when clicking outside (searchRef contains input + suggestions)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Validate form based on current step
  useEffect(() => {
    if (isLogin) {
      setIsFormValid(!!email && !!password);
    } else {
      if (step === 1) {
        setIsFormValid(!!email && !!username && !!password);
      } else if (step === 2) {
        setIsFormValid(!!degree && !!course);
      }
    }
  }, [email, username, password, degree, course, isLogin, step]);

  const doNavigate = (path) => {
    window.location.assign(path);
  };

  const throwUIError = (msg) => {
    setError(msg);
    setLoading(false);
  };

  // Filter courses for autocomplete using Fuse if available, otherwise fallback to simple includes
  let filteredCourses = [];
  if (courseSearch.trim() !== "") {
    if (fuse) {
      filteredCourses = fuse
        .search(courseSearch)
        .map((result) => result.item)
        .filter((c) => !coursesTaken.includes(c));
    } else {
      const q = courseSearch.toLowerCase();
      filteredCourses = availableCourses
        .filter((c) => c.toLowerCase().includes(q) && !coursesTaken.includes(c))
        .slice(0, 8);
    }
  }

  const addCourse = (courseName) => {
    if (!coursesTaken.includes(courseName)) {
      setCoursesTaken([...coursesTaken, courseName]);
      setCourseSearch("");
      setShowSuggestions(false);
    }
  };

  const removeCourse = (courseName) => {
    setCoursesTaken(coursesTaken.filter((c) => c !== courseName));
  };

  const handleNext = () => {
    if (step === 1 && isFormValid) {
      setStep(2);
      setError("");
    }
  };

  const handleBack = () => {
    setStep(1);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });

        if (!response.ok) {
          throwUIError("Invalid email or password");
          return;
        }

        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        doNavigate("/home");
      } else {
        const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            username,
            password,
            degree,
            course,
            courses_taken: coursesTaken,
          }),
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json();
          throwUIError(errorData.detail || "Registration failed");
          return;
        }

        // Auto-login after registration
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const loginResponse = await fetch(`${API_BASE_URL}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });

        if (!loginResponse.ok) {
          throwUIError("Login after registration failed");
          return;
        }

        const data = await loginResponse.json();
        localStorage.setItem("token", data.access_token);
        doNavigate("/home");
      }
    } catch (err) {
      throwUIError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && isFormValid) {
      if (!isLogin && step === 1) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail("");
    setUsername("");
    setPassword("");
    setDegree("");
    setCourse("");
    setCoursesTaken([]);
    setCourseSearch("");
    setError("");
  };

  return (
    <div className="flex min-h-screen w-full bg-[#020617] text-white">
      {/* Left Side - Auth Card */}
      <div className="relative w-full bg-[#020617] lg:w-1/2">
        <div className="absolute left-8 top-6">
          <span className="text-xl font-bold tracking-tight text-[#e5f9ff]">
            COURSE CO-PILOT
          </span>
        </div>

        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050b10]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
            {!isLogin && (
              <div className="mb-6 flex items-center justify-center gap-2">
                <div
                  className={`h-2 w-16 rounded-full transition-colors ${
                    step === 1
                      ? "bg-[#00f4a2] shadow-[0_0_12px_#00f4a2]"
                      : "bg-white/10"
                  }`}
                />
                <div
                  className={`h-2 w-16 rounded-full transition-colors ${
                    step === 2
                      ? "bg-[#00f4a2] shadow-[0_0_12px_#00f4a2]"
                      : "bg-white/10"
                  }`}
                />
              </div>
            )}

            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              {isLogin
                ? "Log in to your account"
                : step === 1
                ? "Create your account"
                : "Complete your profile"}
            </h2>

            {error && (
              <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {(isLogin || step === 1) && (
              <div>
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-white/90"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your email address"
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/40 backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                  />
                </div>

                {!isLogin && (
                  <div className="mb-4">
                    <label
                      htmlFor="username"
                      className="mb-1 block text-sm font-medium text-white/90"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Choose a username"
                      className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/40 backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                    />
                  </div>
                )}

                <div className="mb-2">
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-white/90"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/40 backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                  />
                </div>

                {isLogin && (
                  <div className="mb-4 text-right">
                    <button
                      onClick={() => doNavigate("/forgot-password")}
                      className="text-sm text-white/60 transition-colors hover:text-[#00f4a2]"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  onClick={isLogin ? handleSubmit : handleNext}
                  disabled={loading || !isFormValid}
                  className={`my-4 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                    loading || !isFormValid
                      ? "cursor-not-allowed bg-[#1f2933]/70 text-white/60"
                      : "bg-[#00f4a2] text-black shadow-lg shadow-[#00ffcc40] hover:bg-[#00d68f]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {isLogin ? "Logging in..." : "Processing..."}
                    </span>
                  ) : isLogin ? (
                    "Log in"
                  ) : (
                    "Next"
                  )}
                </button>

                <div className="text-center">
                  <span className="text-sm text-white/60">
                    {isLogin
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        resetForm();
                      }}
                      className="font-medium text-[#00f4a2] underline transition-colors hover:no-underline hover:text-[#00ffcc]"
                    >
                      {isLogin ? "Sign up" : "Log in"}
                    </button>
                  </span>
                </div>
              </div>
            )}

            {!isLogin && step === 2 && (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-4 flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-[#00f4a2]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="mb-4">
                  <label
                    htmlFor="degree"
                    className="mb-1 block text-sm font-medium text-white/90"
                  >
                    Degree
                  </label>
                  <select
                    id="degree"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                  >
                    <option value="">Select your degree</option>
                    <option value="bachelors">Bachelors</option>
                    <option value="masters">Masters</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="course"
                    className="mb-1 block text-sm font-medium text-white/90"
                  >
                    Area of Study
                  </label>
                  <input
                    id="course"
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Computer Science"
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/40 backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="courseSearch"
                    className="mb-1 block text-sm font-medium text-white/90"
                  >
                    Courses Taken (Optional)
                  </label>
                  <div ref={searchRef} className="relative">
                    <input
                      id="courseSearch"
                      type="text"
                      value={courseSearch}
                      onChange={(e) => {
                        setCourseSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search and add courses..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/40 backdrop-blur-md focus:border-[#00f4a2] focus:outline-none focus:ring-1 focus:ring-[#00f4a2]"
                    />

                    {showSuggestions &&
                      courseSearch &&
                      filteredCourses.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#020617] shadow-xl shadow-black/50">
                          {filteredCourses.map((courseName) => (
                            <button
                              key={courseName}
                              onClick={() => addCourse(courseName)}
                              className="w-full px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                            >
                              {courseName}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>

                  {coursesTaken.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {coursesTaken.map((courseName) => (
                        <span
                          key={courseName}
                          className="inline-flex items-center gap-1 rounded-full border border-[#00f4a2]/40 bg-[#003d47] px-3 py-1 text-xs text-[#00f4a2] shadow shadow-[#00ffcc40]"
                        >
                          {courseName}
                          <button
                            onClick={() => removeCourse(courseName)}
                            className="rounded-full p-0.5 transition-colors hover:bg:white/10 hover:bg-white/10"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !isFormValid}
                  className={`my-4 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                    loading || !isFormValid
                      ? "cursor-not-allowed bg-[#1f2933]/70 text-white/60"
                      : "bg-[#00f4a2] text-black shadow-lg shadow-[#00ffcc40] hover:bg-[#00d68f]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Sign up"
                  )}
                </button>

                <div className="text-center">
                  <span className="text-sm text-white/60">
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setIsLogin(true);
                        resetForm();
                      }}
                      className="font-medium text-[#00f4a2] underline transition-colors hover:no-underline hover:text-[#00ffcc]"
                    >
                      Log in
                    </button>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Landing Page */}
      <div className="hidden py-[3vh] pr-[3vh] lg:block lg:w-1/2">
        <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#001f2b] via-[#003846] to-[#000b10]">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#00f5d4] mix-blend-screen blur-[110px] opacity-30 animate-pulse" />
          <div
            className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#00d4ff] mix-blend-screen blur-[110px] opacity-30 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39ff14] mix-blend-screen blur-[120px] opacity-20 animate-pulse"
            style={{ animationDelay: "2s" }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#00ffcc40] bg-white/5 px-4 py-2 backdrop-blur-md">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[#00f4a2]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#e5f9ff]">
                Your Academic Journey Starts Here
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-center space-y-8">
              <div className="space-y-4 text-left">
                <h1 className="text-5xl font-bold leading-tight text-white drop-shadow-[0_0_35px_rgba(0,255,204,0.35)]">
                  Your Intelligent Course Planning Companion
                </h1>
                <p className="max-w-lg text-xl text-white/90">
                  Navigate your academic path with AI-powered insights,
                  personalized recommendations, and smart course comparisons.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {/* Feature 1 */}
                <div className="group rounded-2xl border border-[#00ffcc20] bg-[#0a1a1f]/70 p-5 shadow-xl shadow-[#00ffcc15] backdrop-blur-xl transition-all duration-300 hover:bg-[#0a1a1f]/90 hover:shadow-[#00ffcc40]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00343d] text-white text-3xl shadow-[0_0_12px_#00f4a2] transition-transform group-hover:scale-110">
                    🧠
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    Course Planning Companion
                  </h3>
                  <p className="text-xs leading-relaxed text-white/80">
                    Build your perfect semester schedule with intelligent
                    suggestions
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group rounded-2xl border border-[#00ffcc20] bg-[#0a1a1f]/70 p-5 shadow-xl shadow-[#00ffcc15] backdrop-blur-xl transition-all duration-300 hover:bg-[#0a1a1f]/90 hover:shadow-[#00ffcc40]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00343d] text-white text-3xl shadow-[0_0_12px_#00f4a2] transition-transform group-hover:scale-110">
                    📊
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    Compare Courses
                  </h3>
                  <p className="text-xs leading-relaxed text-white/80">
                    Side-by-side analysis to find your ideal classes
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="group rounded-2xl border border-[#00ffcc20] bg-[#0a1a1f]/70 p-5 shadow-xl shadow-[#00ffcc15] backdrop-blur-xl transition-all duration-300 hover:bg-[#0a1a1f]/90 hover:shadow-[#00ffcc40]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00343d] text-white text-3xl shadow-[0_0_12px_#00f4a2] transition-transform group-hover:scale-110">
                    🧑‍🏫
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    Get to Know Your Professors
                  </h3>
                  <p className="text-xs leading-relaxed text-white/80">
                    Discover teaching styles and student insights
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="group rounded-2xl border border-[#00ffcc20] bg-[#0a1a1f]/70 p-5 shadow-xl shadow-[#00ffcc15] backdrop-blur-xl transition-all duration-300 hover:bg-[#0a1a1f]/90 hover:shadow-[#00ffcc40]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00343d] text-white text-3xl shadow-[0_0_12px_#00f4a2] transition-transform group-hover:scale-110">
                    💡
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    Tailored Course Recommendations
                  </h3>
                  <p className="text-xs leading-relaxed text-white/80">
                    AI-powered suggestions based on your interests and goals
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold leading-relaxed text-white/90">
                Join students who are making smarter academic decisions with
                AI-powered course insights.
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
