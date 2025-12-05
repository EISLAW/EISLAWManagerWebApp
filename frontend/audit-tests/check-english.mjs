import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto("http://localhost:5173/#/privacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const bodyText = await page.locator("body").innerText();

  // Split into words and find English words
  const words = bodyText.split(/\s+/);
  const englishWords = words.filter(w => /^[A-Za-z]{3,}$/.test(w));
  const uniqueEnglish = [...new Set(englishWords)];

  console.log("=== PRIVACY PAGE ENGLISH TEXT AUDIT ===\n");
  console.log("Total words:", words.length);
  console.log("English words found:", englishWords.length);
  console.log("Unique English words:", uniqueEnglish.length);
  console.log("\nUnique English words:");
  uniqueEnglish.forEach(w => console.log(" -", w));

  // Calculate Hebrew ratio
  const hebrewChars = (bodyText.match(/[\u0590-\u05FF]/g) || []).length;
  const totalChars = bodyText.replace(/\s/g, '').length;
  const hebrewRatio = (hebrewChars / totalChars) * 100;

  console.log("\n=== LANGUAGE RATIO ===");
  console.log("Hebrew chars:", hebrewChars);
  console.log("Total chars:", totalChars);
  console.log("Hebrew ratio:", hebrewRatio.toFixed(1) + "%");

  await browser.close();
})();
