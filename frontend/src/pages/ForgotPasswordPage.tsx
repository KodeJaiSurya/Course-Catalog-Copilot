import React, { useState } from "react";
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Zap,
  Shield,
  Check,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const doNavigate = (path: string): void => {
    window.location.assign(path);
  };

  const handleSubmit = async (): Promise<void> => {
    setError("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to send reset email");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" && email) {
      handleSubmit();
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="relative w-full lg:w-1/2 bg-white">
          <div className="absolute left-8 top-6">
            <span className="text-xl font-bold tracking-tight text-black">
              CHATBOT AI
            </span>
          </div>

          <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md p-8">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <h2 className="mb-3 text-center text-2xl font-semibold text-gray-900">
                Check your email
              </h2>

              <p className="mb-6 text-center text-gray-600">
                We've sent a password reset link to <strong>{email}</strong>
              </p>

              <p className="mb-6 text-center text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <button
                onClick={() => doNavigate("/login")}
                className="w-full rounded-full bg-black py-2.5 text-sm text-white transition-colors hover:bg-gray-800"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="hidden py-[3vh] pr-[3vh] lg:block lg:w-1/2">
          <div className="relative h-full rounded-3xl bg-black overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

            <div className="relative flex h-full flex-col justify-between p-12 z-10">
              <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-4 mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6">
                    <Sparkles className="w-10 h-10 text-black" />
                  </div>
                  <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                    Welcome to the Future
                  </h1>
                  <p className="text-xl text-gray-200 max-w-md">
                    Experience next-generation AI conversations
                  </p>
                </div>

                <div className="w-full max-w-xl space-y-4">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-xl p-3 shadow-lg">
                            <p className="text-sm text-gray-800">
                              How can I help you today?
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 ml-10">
                        <div className="flex-1">
                          <div className="bg-black rounded-xl p-3 shadow-lg">
                            <p className="text-sm text-white">
                              Tell me about quantum computing
                            </p>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-gray-800">
                            U
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <Zap className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-xs font-medium text-white">Fast</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <Shield className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-xs font-medium text-white">Secure</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <Check className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-xs font-medium text-white">Reliable</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Now Available
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white leading-relaxed">
                  Join thousands of users experiencing intelligent
                  conversations.
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="relative w-full lg:w-1/2 bg-white">
        <div className="absolute left-8 top-6">
          <span className="text-xl font-bold tracking-tight text-black">
            CHATBOT AI
          </span>
        </div>

        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md p-8">
            <div className="mb-6">
              <button
                onClick={() => doNavigate("/login")}
                className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-black"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>

            <h2 className="mb-6 text-center text-2xl font-semibold">
              Forgot your password?
            </h2>

            <p className="mb-6 text-center text-gray-600">
              No worries! Enter your email address and we'll send you a link to
              reset your password.
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-black"
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
                className="w-full rounded-lg border border-gray-200 p-2 placeholder:text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                autoFocus
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !email}
              className={`w-full rounded-full py-2.5 text-sm text-white transition-colors ${
                loading
                  ? "cursor-not-allowed bg-gray-400"
                  : email
                  ? "bg-black hover:bg-gray-800"
                  : "cursor-not-allowed bg-gray-400"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="mr-2 h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending reset link...
                </span>
              ) : (
                "Send reset link"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="hidden py-[3vh] pr-[3vh] lg:block lg:w-1/2">
        <div className="relative h-full rounded-3xl bg-black overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <div className="relative flex h-full flex-col justify-between p-12 z-10">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <div className="text-center space-y-4 mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6">
                  <Sparkles className="w-10 h-10 text-black" />
                </div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                  Welcome to the Future
                </h1>
                <p className="text-xl text-gray-200 max-w-md">
                  Experience next-generation AI conversations
                </p>
              </div>

              <div className="w-full max-w-xl space-y-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-black" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-xl p-3 shadow-lg">
                          <p className="text-sm text-gray-800">
                            How can I help you today?
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 ml-10">
                      <div className="flex-1">
                        <div className="bg-black rounded-xl p-3 shadow-lg">
                          <p className="text-sm text-white">
                            Tell me about quantum computing
                          </p>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-gray-800">
                          U
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-white" />
                    <p className="text-xs font-medium text-white">Fast</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-white" />
                    <p className="text-xs font-medium text-white">Secure</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                    <Check className="w-6 h-6 mx-auto mb-2 text-white" />
                    <p className="text-xs font-medium text-white">Reliable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Now Available
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white leading-relaxed">
                Join thousands of users experiencing intelligent conversations.
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
