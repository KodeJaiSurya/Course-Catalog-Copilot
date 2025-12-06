import React from "react";
import { Link } from "react-router-dom";

export default function DataSourcesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-emerald-400 mb-4">
          Data Sources & Accuracy
        </h1>

        <p className="text-slate-300 text-sm mb-8">
          Last updated: December 2025
        </p>

        <div className="space-y-6 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Where does the information come from?
            </h2>
            <p className="text-slate-400">
              Course Co‑Pilot focuses on up-to-date guidance from these sources:
            </p>
            <ul className="list-disc ml-6 mt-2 text-slate-400 space-y-1">
              <li>Rate My Professor</li>
              <li>Official course catalog</li>
              <li>Search NEU</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              No official affiliation
            </h2>
            <p className="text-slate-400">
              Even though we reference the official course catalog and Search
              NEU to surface the most accurate details available, Course
              Co‑Pilot is
              <strong> not officially affiliated</strong> with Northeastern or
              any other university. We compile public information to offer
              planning support without representing any institution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Accuracy disclaimer
            </h2>
            <p className="text-slate-400">
              While we aim for helpful and realistic guidance, academic programs
              vary widely. Course availability, prerequisites, and professor
              details may change each semester.
            </p>

            <p className="text-slate-400 mt-2">
              For final decisions, always confirm details with:
            </p>
            <ul className="list-disc ml-6 mt-2 text-slate-400 space-y-1">
              <li>Your academic advisor</li>
              <li>Your university’s official course catalog</li>
              <li>Department announcements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Why this matters
            </h2>
            <p className="text-slate-400">
              The goal of Course Co‑Pilot is to assist your planning — not
              replace official academic guidance. Use it as a starting point,
              not a final source.
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
