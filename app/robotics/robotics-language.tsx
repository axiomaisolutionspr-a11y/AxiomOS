"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type RoboticsLanguage = "es" | "en";

type RoboticsLanguageContextValue = {
  language: RoboticsLanguage;
  setLanguage: (language: RoboticsLanguage) => void;
  toggleLanguage: () => void;
};

const RoboticsLanguageContext = createContext<RoboticsLanguageContextValue | null>(null);

export function RoboticsLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<RoboticsLanguage>("es");

  useEffect(() => {
    const saved = window.localStorage.getItem("axiomai-robotics-language");
    if (saved === "en" || saved === "es") setLanguage(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("axiomai-robotics-language", language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "es" ? "en" : "es")),
    }),
    [language],
  );

  return <RoboticsLanguageContext.Provider value={value}>{children}</RoboticsLanguageContext.Provider>;
}

export function useRoboticsLanguage() {
  const context = useContext(RoboticsLanguageContext);
  if (!context) throw new Error("useRoboticsLanguage must be used inside RoboticsLanguageProvider");
  return context;
}
