import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  ArrowLeft,
  Save,
  Mail,
  GraduationCap,
  BookOpen,
  Edit2,
  X,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [degree, setDegree] = useState("");
  const [course, setCourse] = useState("");
  const [coursesTaken, setCoursesTaken] = useState([]);

  const [courseSearch, setCourseSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    loadUser();
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const apiFetch = async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      throw new Error(error.detail || "Request failed");
    }
    return response.json();
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cleaned_titles`);
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setAvailableCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await apiFetch("/users/me");
      setUser(userData);
      setUsername(userData.username || "");
      setDegree(userData.degree || "");
      setCourse(userData.course || "");
      setCoursesTaken(userData.courses_taken || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load user:", error);
      setError("Failed to load profile");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({
          username,
          degree,
          course,
          courses_taken: coursesTaken,
        }),
      });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

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

  const fuzzySearch = (query, items) => {
    const lowerQuery = query.toLowerCase();
    return items
      .filter((item) => item.toLowerCase().includes(lowerQuery))
      .slice(0, 8);
  };

  const filteredCourses =
    courseSearch.trim() !== ""
      ? fuzzySearch(courseSearch, availableCourses).filter(
          (course) => !coursesTaken.includes(course)
        )
      : [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1419]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <div className="bg-[#1a1f2e] border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/home")}
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
          <h1 className="text-xl font-semibold text-white">Profile Settings</h1>
          <div className="w-24"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/20 border border-red-800 p-4 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg bg-emerald-900/20 border border-emerald-800 p-4 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#1a1f2e] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 px-8 py-12 border-b border-gray-800">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center shadow-lg border-2 border-emerald-500/20">
                <User className="h-12 w-12 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {user?.username}
                </h2>
                <p className="text-gray-400 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-500" />
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500" />
                Email
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="w-full bg-[#0a0e13] border-gray-800 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Degree */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                Degree
              </label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#0f1419] text-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select your degree</option>
                <option value="bachelors">Bachelors</option>
                <option value="masters">Masters</option>
              </select>
            </div>

            {/* Area of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                Area of Study
              </label>
              <Input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Courses Taken */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-emerald-500" />
                Courses Taken
              </label>
              <div ref={searchRef} className="relative">
                <Input
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search and add courses..."
                  className="w-full bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                />
                {showSuggestions &&
                  courseSearch &&
                  filteredCourses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {filteredCourses.map((courseName) => (
                        <button
                          key={courseName}
                          onClick={() => addCourse(courseName)}
                          className="w-full text-left px-4 py-2 hover:bg-[#0f1419] text-sm text-gray-300 hover:text-white transition-colors"
                        >
                          {courseName}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              {coursesTaken.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    {coursesTaken.length} course
                    {coursesTaken.length !== 1 ? "s" : ""} added
                  </p>
                  <ScrollArea className="max-h-64 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {coursesTaken.map((courseName) => (
                        <span
                          key={courseName}
                          className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm"
                        >
                          <span
                            className="max-w-[200px] truncate"
                            title={courseName}
                          >
                            {courseName}
                          </span>
                          <button
                            onClick={() => removeCourse(courseName)}
                            className="hover:bg-emerald-500/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              {coursesTaken.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No courses added yet
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-800">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3 shadow-lg shadow-emerald-900/20"
              >
                {saving ? (
                  <span className="flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
