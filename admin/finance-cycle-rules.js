((root) => {
  const rules = Object.freeze({
    urgencyFor(day) {
      const value = Number(day);
      if (!Number.isFinite(value) || value < 1 || value > 31) return "high";
      if (value >= 5 && value <= 19) return "low";
      if (value >= 20 && value <= 25) return "medium";
      return "high";
    }
  });

  root.SDLiveFinanceCycleRules = rules;
})(typeof window !== "undefined" ? window : globalThis);
