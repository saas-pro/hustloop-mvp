// Simple Tab Component with Animated Border for "Yearly" Tab

import React, { useState } from "react";

export default function BillingTabs() {
  const [selected, setSelected] = useState("monthly");

  return (
    <div className="flex space-x-2 mb-8 justify-center">
      {/* Monthly Tab */}
      <button
        onClick={() => setSelected("monthly")}
        className={`px-8 py-2 rounded-lg text-lg font-semibold focus:outline-none transition
          ${selected === "monthly" ? "bg-white text-red-700 shadow" : "bg-red-900/10 text-white"}`}
      >
        Monthly
      </button>
      {/* Yearly Tab with Animated Border */}
      <div className="relative">
        {/* Animated border */}
        {selected === "yearly" && (
          <span className="absolute -inset-1 rounded-[10px] bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 animate-gradient-border z-0" />
        )}
        <button
          onClick={() => setSelected("yearly")}
          className={`relative px-8 py-2 rounded-lg text-lg font-semibold focus:outline-none z-10 transition
            ${selected === "yearly" ? "bg-white text-purple-700 shadow" : "bg-red-900/10 text-white"}
          `}
          style={{ overflow: "hidden" }}
        >
          Yearly
        </button>
      </div>
      <style jsx>{`
        .animate-gradient-border {
          background-size: 200% 200%;
          animation: gradientMove 2.2s linear infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
