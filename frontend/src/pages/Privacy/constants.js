// Algorithm fields to display - centralized config
export const ALGORITHM_FIELDS = [
  "ppl", "sensitive_people", "sensitive", "sensitive_types", "owners", "access",
  "ethics", "transfer", "directmail_biz", "directmail_self", "processor",
  "processor_large_org", "processor_sensitive_org", "cameras", "biometric_100k",
  "biometric_people", "monitor_1000", "employees_exposed"
];

// Rule explanations in Hebrew
export const LEVEL_EXPLANATIONS = {
  lone: {
    title: "רמה: יחיד",
    reasons: [
      "אין חובת סודיות מקצועית",
      "עד 2 בעלים",
      "עד 2 מורשי גישה",
      "אין דיוור ישיר למען אחר",
      "אין העברת מידע לאחר בתמורה",
      "פחות מ-10,000 אנשים במאגר"
    ]
  },
  basic: {
    title: "רמה: בסיסית",
    reasons: [
      "אין דיוור ישיר למען אחר",
      "אין העברת מידע לאחר בתמורה",
      "לא עומד בתנאי \"יחיד\"",
      "אין מידע רגיש או מורשי גישה מועטים"
    ]
  },
  mid: {
    title: "רמה: בינונית",
    reasons: [
      "לא עומד בתנאי \"בסיסית\" או \"יחיד\"",
      "או: מעבד מידע",
      "או: נדרש רישום מאגר"
    ]
  },
  high: {
    title: "רמה: גבוהה",
    reasons: [
      "מעל 100,000 אנשים במאגר",
      "או: מעל 100,000 אנשים עם מידע רגיש",
      "או: מאגר ביומטרי גדול",
      "או: מעבד לגוף גדול/רגיש",
      "או: מידע רגיש עם הרבה מורשי גישה"
    ]
  }
};

// DPO trigger explanations
export const DPO_EXPLANATIONS = [
  "נדרש רישום מאגר",
  "נדרש דיווח",
  "ניטור שוטף מעל 1000 אנשים",
  "מעל 1000 אנשים עם מידע רגיש"
];
