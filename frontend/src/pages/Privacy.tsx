import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-emerald-400 mb-4">
          Privacy & Data Use
        </h1>

        <p className="text-slate-300 text-sm mb-8">
          Last updated: December 2025
        </p>

        <div className="space-y-6 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              What data do we collect?
            </h2>
            <p className="text-slate-400">
              Course Co‑Pilot only stores the minimum data needed for your
              academic planning experience. This includes:
            </p>
            <ul className="list-disc ml-6 mt-2 text-slate-400 space-y-1">
              <li>Your account email and username</li>
              <li>Your degree and major</li>
              <li>Your course history (if applicable)</li>
              <li>Your conversations and planning history</li>
              <li>Basic system logs used to ensure stable functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              How is your data used?
            </h2>
            <p className="text-slate-400">
              Your data is used exclusively to personalize your experience and
              improve academic planning suggestions. We do <strong>not</strong>
              sell, share, or distribute your data to any third‑party
              organizations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Conversations & AI
            </h2>
            <p className="text-slate-400">
              Conversations may be processed by AI models to generate responses.
              These conversations remain private to your account and are never
              used to identify you personally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Your rights
            </h2>
            <ul className="list-disc ml-6 mt-2 text-slate-400 space-y-1">
              <li>You may delete your conversations at any time</li>
              <li>You may update your profile information</li>
              <li>You can request account deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Contact
            </h2>
            <p className="text-slate-400">
              For privacy questions, contact the Course Co‑Pilot team;
              coursecopilot@gmail.com
            </p>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/home"
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
