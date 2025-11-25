import React, { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE_URL = "http://localhost:8000";

interface Course {
  id: string;
  course_code: string;
  title: string;
}

interface SelectedCourse {
  course_code: string;
  title: string;
}

export default function AcademicOnboardingPage() {
  const [educationLevel, setEducationLevel] = useState("");
  const [major, setMajor] = useState("");
  const [courseInput, setCourseInput] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [courseSuggestions, setCourseSuggestions] = useState<Course[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Validation states
  const [touched, setTouched] = useState({
    educationLevel: false,
    major: false,
  });

  // Debounced course search
  useEffect(() => {
    if (courseInput.trim().length < 2) {
      setCourseSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      searchCourses(courseInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [courseInput]);

  const searchCourses = async (query: string) => {
    if (!query.trim()) return;

    setLoadingSuggestions(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${API_BASE_URL}/rag/search/courses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            query: query,
            limit: 10
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search courses");
      }

      const data = await response.json();
      
      // Transform the response to match our Course interface
      const courses = data.results.map((result: any) => ({
        id: result.data.id,
        course_code: result.data.course_code,
        title: result.data.title
      }));
      
      setCourseSuggestions(courses);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error searching courses:", err);
      setCourseSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addCourse = (course: Course) => {
    // Check if already added
    const alreadyAdded = selectedCourses.some(
      (c) => c.course_code === course.course_code
    );

    if (!alreadyAdded) {
      setSelectedCourses([
        ...selectedCourses,
        { course_code: course.course_code, title: course.title },
      ]);
    }

    setCourseInput("");
    setCourseSuggestions([]);
    setShowSuggestions(false);
  };

  const removeCourse = (courseCode: string) => {
    setSelectedCourses(
      selectedCourses.filter((c) => c.course_code !== courseCode)
    );
  };

  const validateForm = () => {
    return educationLevel !== "" && major.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ educationLevel: true, major: true });

    if (!validateForm()) {
      setError("Please fill in all required fields");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/users/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          education_level: educationLevel,
          major: major.trim(),
          completed_courses: selectedCourses.map((c) => c.course_code),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Onboarding failed");
      }

      setSuccess(true);

      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = "/home";
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const showEducationError = touched.educationLevel && educationLevel === "";
  const showMajorError = touched.major && major.trim() === "";

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Side - Form */}
      <div className="relative w-full lg:w-1/2 bg-white">
        <div className="absolute left-8 top-6">
          <span className="text-xl font-bold tracking-tight text-black">
            CHATBOT AI
          </span>
        </div>

        <div className="flex min-h-screen items-center justify-center px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-3xl font-bold text-black">
                Academic Profile
              </h2>
              <p className="text-gray-600">
                Help us personalize your experience
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Onboarding completed successfully! Redirecting...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Education Level */}
              <div>
                <label
                  htmlFor="educationLevel"
                  className="mb-1.5 block text-sm font-medium text-black"
                >
                  Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="educationLevel"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  onBlur={() =>
                    setTouched({ ...touched, educationLevel: true })
                  }
                  className={`w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 ${
                    showEducationError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-200 focus:border-black focus:ring-black"
                  }`}
                  disabled={submitting}
                >
                  <option value="">Select your education level</option>
                  <option value="Bachelors">Bachelors</option>
                  <option value="Masters">Masters</option>
                </select>
                {showEducationError && (
                  <p className="mt-1 text-xs text-red-500">
                    Education level is required
                  </p>
                )}
              </div>

              {/* Major */}
              <div>
                <label
                  htmlFor="major"
                  className="mb-1.5 block text-sm font-medium text-black"
                >
                  Major <span className="text-red-500">*</span>
                </label>
                <Input
                  id="major"
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  onBlur={() => setTouched({ ...touched, major: true })}
                  placeholder="e.g., Computer Science"
                  disabled={submitting}
                  className={`${
                    showMajorError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-200"
                  }`}
                />
                {showMajorError && (
                  <p className="mt-1 text-xs text-red-500">Major is required</p>
                )}
              </div>

              {/* Completed Courses */}
              <div>
                <label
                  htmlFor="courses"
                  className="mb-1.5 block text-sm font-medium text-black"
                >
                  Completed Courses{" "}
                  <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Input
                    id="courses"
                    type="text"
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    onFocus={() => courseInput && setShowSuggestions(true)}
                    placeholder="Start typing to search courses..."
                    disabled={submitting}
                  />

                  {loadingSuggestions && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}

                  {/* Suggestions Dropdown */}
                  {showSuggestions && courseSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {courseSuggestions.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => addCourse(course)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm text-black">
                            {course.course_code}
                          </div>
                          <div className="text-xs text-gray-600">
                            {course.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Courses - Chips */}
                {selectedCourses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCourses.map((course) => (
                      <div
                        key={course.course_code}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm"
                      >
                        <span className="font-medium text-black">
                          {course.course_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCourse(course.course_code)}
                          className="text-gray-500 hover:text-black"
                          disabled={submitting}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-500">
                  If you're a fresher, you can skip this and submit with no
                  courses selected
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting || !validateForm()}
                className={`w-full rounded-full py-2.5 text-sm text-white transition-colors ${
                  submitting || !validateForm()
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-black hover:bg-gray-800"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Complete Onboarding"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden py-[3vh] pr-[3vh] lg:block lg:w-1/2">
        <div className="relative h-full overflow-hidden rounded-3xl bg-black">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gray-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <div className="relative flex h-full flex-col items-center justify-center p-12 z-10">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-2xl mb-6">
                <GraduationCap className="w-12 h-12 text-black" />
              </div>

              <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                Let's Get Started
              </h1>

              <p className="text-xl text-gray-200 max-w-md leading-relaxed">
                We need a few details to provide you with personalized course
                recommendations and academic guidance
              </p>

              <div className="mt-12 space-y-4 max-w-md">
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-black" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      Privacy Protected
                    </p>
                    <p className="text-xs text-gray-300">
                      We only collect academic information
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-black" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      Personalized Experience
                    </p>
                    <p className="text-xs text-gray-300">
                      Tailored recommendations just for you
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-black" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      Quick Setup
                    </p>
                    <p className="text-xs text-gray-300">
                      Takes less than a minute
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
