import React from "react";
import { Link } from "react-router-dom";

export default function FairnessAndLimitationsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-emerald-400 mb-4">
          Fairness &amp; Limitations
        </h1>

        <p className="text-slate-300 text-sm mb-8">
          Last updated: December 2025
        </p>

        <div className="space-y-6 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Designed to reduce bias
            </h2>
            <p className="text-slate-400">
              Course Co-Pilot aggregates public sources like Search NEU, the
              official course catalog, and Rate My Professor to give balanced
              academic guidance. We try to surface varied perspectives so one
              review or data point never dominates the experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Limitations you should know
            </h2>
            <ul className="list-disc ml-6 mt-2 text-slate-400 space-y-1">
              <li>
                Professor reviews can be subjective and sometimes outdated.
              </li>
              <li>
                Course availability changes each term, and the catalog may lag
                behind departmental announcements.
              </li>
              <li>
                AI-generated planning suggestions might misunderstand unique
                degree requirements.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              How to stay fair
            </h2>
            <p className="text-slate-400">
              Use Course Co-Pilot as a starting point, then validate information
              with advisors or official university resources. When possible,
              compare multiple professor reviews and double-check prerequisites
              before registering.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Help us improve
            </h2>
            <p className="text-slate-400">
              If you notice inaccurate, biased, or missing information, please
              reach out so we can make adjustments quickly.
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
