"use client";

import { useEffect, useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  FileImage,
  FileCode2,
  ArrowRight,
  Loader2,
  Info,
  Moon,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EnterpriseDashboard() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const MIN_CLIENT_INTERVAL_MS = 3200;
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedResult, setTranslatedResult] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationEta, setTranslationEta] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingMultiple, setProcessingMultiple] = useState(false);
  const [result, setResult] = useState(null);
  const [multiAnalyzeResults, setMultiAnalyzeResults] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [error, setError] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const fileInputRef = useRef(null);
  const lastRequestAtRef = useRef(0);
  const translationCacheRef = useRef({});
  const displayResult = selectedLanguage === "en" ? result : translatedResult || result;
  const formattedWarning = displayResult?.warning
    ? displayResult.warning.length > 140
      ? `${displayResult.warning.slice(0, 140)}...`
      : displayResult.warning
    : null;
  const copy = {
    en: {
      extractedEntities: "Extracted Entities",
      entityFocus: "Entity Focus",
      businessContext: "Business Context",
      actionableSteps: "Actionable Steps",
      actionableDescription: "Mandates issued by the system architecture guidelines.",
      analysisSource: "Analysis source",
      fallback: "Fallback engine",
      gemini: "Gemini",
      tryAgain: "Try Again",
      language: "Output language",
      translating: "Translating...",
      etaPrefix: "Estimated",
      secondsShort: "s",
      atsTitle: "ATS Resume Score",
      atsDescription: "Automated resume screening readiness score.",
      compareTitle: "Compare Multiple Documents",
      compareDescription: "Upload 2-5 files of the same type (resume/contract) to compare differences.",
      runCompare: "Run Comparison",
      runAnalyzeMany: "Analyze Documents",
      exportDocx: "Export DOCX",
      exportPdf: "Export PDF",
      comparisonOutput: "Comparison Matrix",
      verdict: "Verdict",
      fileName: "File",
      score: "Score",
      highlights: "Highlights",
      attribute: "Attribute",
      difference: "Difference",
      assessment: "Assessment",
    },
    hi: {
      extractedEntities: "निकाली गई इकाइयां",
      entityFocus: "मुख्य बिंदु",
      businessContext: "व्यावसायिक संदर्भ",
      actionableSteps: "कार्रवाई योग्य कदम",
      actionableDescription: "सिस्टम आर्किटेक्चर दिशानिर्देशों के अनुसार सुझाए गए कदम।",
      analysisSource: "विश्लेषण स्रोत",
      fallback: "फॉलबैक इंजन",
      gemini: "जेमिनी",
      tryAgain: "फिर से कोशिश करें",
      language: "आउटपुट भाषा",
      translating: "अनुवाद हो रहा है...",
      etaPrefix: "अनुमानित",
      secondsShort: "से",
      atsTitle: "एटीएस रेज़्यूमे स्कोर",
      atsDescription: "स्वचालित रिज्यूमे स्क्रीनिंग तैयारी स्कोर।",
    },
    mr: {
      extractedEntities: "काढलेली माहिती",
      entityFocus: "मुख्य घटक",
      businessContext: "व्यवसाय संदर्भ",
      actionableSteps: "अमलात आणण्याजोगी पावले",
      actionableDescription: "सिस्टम आर्किटेक्चर मार्गदर्शक तत्त्वांनुसार सुचवलेली पावले.",
      analysisSource: "विश्लेषण स्रोत",
      fallback: "फॉलबॅक इंजिन",
      gemini: "जेमिनी",
      tryAgain: "पुन्हा प्रयत्न करा",
      language: "आउटपुट भाषा",
      translating: "भाषांतर सुरू आहे...",
      etaPrefix: "अंदाजे",
      secondsShort: "से",
      atsTitle: "ATS रेझ्युमे स्कोअर",
      atsDescription: "स्वयंचलित रेझ्युमे स्क्रिनिंगसाठी तयारीचा स्कोअर.",
    },
  };
  const t = { ...copy.en, ...(copy[selectedLanguage] || {}) };

  const parseRetrySeconds = (message) => {
    const match = message.match(/retry in\s+(\d+)s/i) || message.match(/wait\s+(\d+)s/i);
    return match ? Number(match[1]) : 0;
  };

  const hasDevanagari = (payload) => {
    const text = [
      ...(payload?.entities || []).flatMap((e) => [e?.fact || "", e?.so_what || ""]),
      ...((payload?.next_steps || []).map((s) => s || "")),
    ].join(" ");
    return /[\u0900-\u097F]/.test(text);
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!translating) return;
    if (translationEta <= 0) return;
    const timer = setTimeout(() => setTranslationEta((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [translating, translationEta]);

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme");
    const preferredTheme =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : preferredTheme;
    root.classList.toggle("dark", nextTheme === "dark");
  }, []);

  const handleThemeToggle = () => {
    const root = document.documentElement;
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files).slice(0, 5));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files).slice(0, 5));
    }
  };

  const runAnalyze = async ({ resetResult = false } = {}) => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    const now = Date.now();
    const elapsed = now - lastRequestAtRef.current;
    if (elapsed < MIN_CLIENT_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_CLIENT_INTERVAL_MS - elapsed) / 1000);
      setCooldownSeconds(waitSeconds);
      setError(`Please wait ${waitSeconds}s before sending another request.`);
      return;
    }
    lastRequestAtRef.current = now;
    setLoading(true);
    setError(null);
    setCooldownSeconds(0);
    if (resetResult) {
      setResult(null);
      setMultiAnalyzeResults([]);
      setCompareResult(null);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData, // No content-type header, fetch sets multipart with boundary
      });
      if (!res.ok) {
        throw new Error("Analysis failed: " + await res.text());
      }
      const data = await res.json();
      setResult(data);
      setSelectedLanguage("en");
      setTranslatedResult(null);
      translationCacheRef.current = {};
      setTranslationEta(0);
    } catch (err) {
      const message = err.message || "Request failed.";
      setError(message);
      const waitSeconds = parseRetrySeconds(message);
      if (waitSeconds > 0) {
        setCooldownSeconds(waitSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    await runAnalyze({ resetResult: true });
  };

  const handleAnalyzeMany = async () => {
    if (selectedFiles.length < 2) {
      setError("Select at least 2 files for multi-document analysis.");
      return;
    }
    const now = Date.now();
    const elapsed = now - lastRequestAtRef.current;
    if (elapsed < MIN_CLIENT_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_CLIENT_INTERVAL_MS - elapsed) / 1000);
      setCooldownSeconds(waitSeconds);
      setError(`Please wait ${waitSeconds}s before sending another request.`);
      return;
    }
    lastRequestAtRef.current = now;
    setProcessingMultiple(true);
    setError(null);
    setCooldownSeconds(0);
    setResult(null);
    setCompareResult(null);
    setMultiAnalyzeResults([]);
    try {
      const aggregate = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          throw new Error(`Analysis failed for ${file.name}: ${await res.text()}`);
        }
        const data = await res.json();
        aggregate.push({ fileName: file.name, data });
      }
      setMultiAnalyzeResults(aggregate);
    } catch (err) {
      const message = err.message || "Multi-document analysis failed.";
      setError(message);
    } finally {
      setProcessingMultiple(false);
    }
  };

  const handleCompare = async () => {
    if (selectedFiles.length < 2) {
      setError("Select at least 2 files for comparison.");
      return;
    }
    const now = Date.now();
    const elapsed = now - lastRequestAtRef.current;
    if (elapsed < MIN_CLIENT_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_CLIENT_INTERVAL_MS - elapsed) / 1000);
      setCooldownSeconds(waitSeconds);
      setError(`Please wait ${waitSeconds}s before sending another request.`);
      return;
    }
    lastRequestAtRef.current = now;
    setProcessingMultiple(true);
    setError(null);
    setCooldownSeconds(0);
    setResult(null);
    setMultiAnalyzeResults([]);
    setCompareResult(null);
    const formData = new FormData();
    selectedFiles.forEach((selectedFile) => formData.append("files", selectedFile));
    try {
      const res = await fetch(`${API_BASE_URL}/compare`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Comparison failed: " + await res.text());
      }
      const data = await res.json();
      setCompareResult(data);
    } catch (err) {
      const message = err.message || "Comparison request failed.";
      setError(message);
      const waitSeconds = parseRetrySeconds(message);
      if (waitSeconds > 0) {
        setCooldownSeconds(waitSeconds);
      }
    } finally {
      setProcessingMultiple(false);
    }
  };

  const handleLanguageChange = async (languageCode) => {
    setSelectedLanguage(languageCode);
    if (languageCode === "en" || !result) {
      setTranslationEta(0);
      return;
    }

    const cachedTranslation = translationCacheRef.current[languageCode];
    if (cachedTranslation) {
      setTranslatedResult(cachedTranslation);
      setTranslationEta(0);
      return;
    }

    const estimateSeconds = Math.min(
      18,
      Math.max(5, Math.ceil(((result?.entities?.length || 2) + (result?.next_steps?.length || 2)) * 1.3))
    );
    setTranslating(true);
    setTranslationEta(estimateSeconds);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch(`${API_BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, target_language: languageCode }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error("Translation failed: " + (await res.text()));
      }
      const data = await res.json();
      if ((languageCode === "hi" || languageCode === "mr") && !hasDevanagari(data)) {
        throw new Error("Translation returned without Hindi/Marathi content. Please try again.");
      }
      setTranslatedResult(data);
      translationCacheRef.current[languageCode] = data;
    } catch (err) {
      const isAbortError = err?.name === "AbortError";
      setError(isAbortError ? "Translation timed out. Please retry." : (err.message || "Translation request failed."));
      setSelectedLanguage("en");
      setTranslatedResult(null);
    } finally {
      clearTimeout(timeoutId);
      setTranslating(false);
      setTranslationEta(0);
    }
  };

  const exportAnalysis = async (format) => {
    if (!displayResult) return;
    try {
      const primaryName = selectedFiles?.[0]?.name || "analysis_report";
      const res = await fetch(`${API_BASE_URL}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: displayResult,
          document_name: primaryName,
          export_format: format,
        }),
      });
      if (!res.ok) {
        throw new Error("Export failed: " + (await res.text()));
      }
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "docx";
      const cleanName = (primaryName || "analysis_report").replace(/\.[^/.]+$/, "");
      const downloadName = `${cleanName}_analysis.${ext}`;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Export request failed.");
    }
  };

  const getWinnerFileName = () => {
    if (!compareResult?.files?.length) return null;
    const byScore = [...compareResult.files].sort((a, b) => {
      const aScore = typeof a.ats_score === "number" ? a.ats_score : (a.contract_score ?? -1);
      const bScore = typeof b.ats_score === "number" ? b.ats_score : (b.contract_score ?? -1);
      return bScore - aScore;
    })[0];
    return byScore?.filename || null;
  };

  const winnerFileName = getWinnerFileName();

  const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();

  const parseNumericSignal = (value) => {
    const raw = String(value ?? "");
    const fractionMatch = raw.match(/(-?\d+(?:\.\d+)?)\s*\/\s*100/);
    if (fractionMatch) return Number(fractionMatch[1]);
    const numberMatch = raw.match(/-?\d+(?:\.\d+)?/);
    return numberMatch ? Number(numberMatch[0]) : null;
  };

  const pickBetterValueFile = (attribute, valuesByFile) => {
    const entries = Object.entries(valuesByFile || {});
    if (entries.length < 2) return null;

    // If all values are effectively identical, highlight nothing.
    const normalizedDistinct = new Set(entries.map(([, value]) => normalizeValue(value)));
    if (normalizedDistinct.size <= 1) return null;

    const lowerAttr = String(attribute || "").toLowerCase();
    const numericEntries = entries
      .map(([name, value]) => ({ name, value, numeric: parseNumericSignal(value) }))
      .filter((item) => Number.isFinite(item.numeric));

    // Use numeric comparison for score-like rows.
    if (lowerAttr.includes("score") && numericEntries.length === entries.length) {
      const sorted = [...numericEntries].sort((a, b) => b.numeric - a.numeric);
      if (sorted[0].numeric === sorted[1].numeric) return null;
      return sorted[0].name;
    }

    // Heuristic for clause-based contract attributes:
    // most protective clauses are better when present, but risk clauses are better when absent.
    const presenceGood = !(
      lowerAttr.includes("penalty") ||
      lowerAttr.includes("liquidated damages") ||
      lowerAttr.includes("non-refundable") ||
      lowerAttr.includes("unlimited liability") ||
      lowerAttr.includes("auto-renew") ||
      lowerAttr.includes("automatic renewal")
    );

    const isAbsent = (value) => {
      const v = normalizeValue(value);
      return ["not found", "no", "none found", "n/a", ""].includes(v);
    };

    const scored = entries.map(([name, value]) => {
      const absent = isAbsent(value);
      const score = presenceGood ? (absent ? 0 : 1) : (absent ? 1 : 0);
      return { name, score };
    });

    const top = scored.reduce((best, current) => (current.score > best.score ? current : best), scored[0]);
    const topCount = scored.filter((item) => item.score === top.score).length;
    if (topCount !== 1) return null;
    return top.name;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 text-foreground font-sans sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center rounded-xl shadow-md shadow-primary/20">
            <FileCode2 size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">DocuSense Platform</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1">Extract • Analyze • Compare</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleThemeToggle} className="gap-2 px-4 cursor-pointer">
            <Moon className="size-4" />
            Toggle dark mode
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* File Upload Zone */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="shadow-lg border-border/70 bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">Document Source</CardTitle>
                <CardDescription>Upload a PDF, Microsoft Word, Image, or plain text document.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:bg-muted/40 hover:border-primary/40"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    multiple
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                  />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center cursor-pointer px-6">
                    {selectedFiles.length > 0 ? (
                      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <FileText className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground break-all max-w-[260px]">
                            {selectedFiles.length} file(s) selected
                          </p>
                          <p className="text-sm text-muted-foreground">{selectedFiles.map((f) => f.name).join(", ")}</p>
                        </div>
                        <p className="text-xs font-medium text-primary mt-2 bg-primary/10 px-3 py-1 rounded-full transition-colors">Click to change files</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-muted rounded-full mb-4">
                          <UploadCloud className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="mb-2 text-base text-foreground/90"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs font-medium text-muted-foreground">PDF, DOCX, PNG, JPG, TXT (MAX. 20MB, up to 5 files)</p>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3 text-red-800 text-sm animate-in slide-in-from-top-2">
                    <Info size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/40 border-t border-border/70 rounded-b-xl py-6">
                <div className="w-full space-y-3">
                  {selectedFiles.length === 1 && (
                    <Button 
                      onClick={handleAnalyze} 
                      disabled={loading || cooldownSeconds > 0} 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 rounded-lg transition-transform active:scale-[0.99] shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Processing Rules Engine...</span>
                      ) : (
                        <span className="flex items-center gap-2">Execute Extraction Protocol <ArrowRight size={18} /></span>
                      )}
                    </Button>
                  )}
                  {selectedFiles.length >= 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={handleAnalyzeMany}
                        disabled={processingMultiple || cooldownSeconds > 0}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 rounded-lg transition-transform active:scale-[0.99] shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingMultiple ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                        ) : (
                          <span className="flex items-center gap-2">{t.runAnalyzeMany} <ArrowRight size={18} /></span>
                        )}
                      </Button>
                      <Button
                        onClick={handleCompare}
                        disabled={processingMultiple || cooldownSeconds > 0}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 rounded-lg transition-transform active:scale-[0.99] shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingMultiple ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                        ) : (
                          <span className="flex items-center gap-2">{t.runCompare} <ArrowRight size={18} /></span>
                        )}
                      </Button>
                    </div>
                  )}
                  {cooldownSeconds > 0 && (
                    <p className="text-xs text-muted-foreground text-center">Rate limit cooldown: {cooldownSeconds}s</p>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Results Analytics output */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            {!result && !compareResult && multiAnalyzeResults.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-12 bg-card/40 border border-border/80 border-dashed rounded-xl">
                 <div className="p-6 bg-card rounded-full shadow-sm mb-6 border border-border/60">
                   <FileImage className="w-12 h-12 text-muted-foreground/60" />
                 </div>
                <p className="text-muted-foreground font-semibold tracking-wide text-sm bg-card px-6 py-2 rounded-full shadow-sm border border-border/70">Awaiting payload analysis</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {result && (
                  <>
                <Card className="bg-card border-border/80 shadow-sm">
                  <CardContent className="py-4 px-6 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.analysisSource}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${displayResult.source === "fallback" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                      {displayResult.source === "fallback" ? t.fallback : (displayResult.source === "ollama" ? "Ollama" : t.gemini)}
                    </span>
                    {formattedWarning && (
                      <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        {formattedWarning}
                      </span>
                    )}
                    {translating && (
                      <span className="text-xs text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <TriangleAlert className="size-3.5 text-amber-600" />
                        {t.etaPrefix} {translationEta || 1}
                        {t.secondsShort}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <label htmlFor="language-select" className="text-xs text-muted-foreground">
                        {t.language}
                      </label>
                      <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        disabled={translating}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="mr">Marathi</option>
                      </select>
                    </div>
                    <Button
                      onClick={() => runAnalyze({ resetResult: false })}
                      disabled={loading || translating || selectedFiles.length !== 1 || cooldownSeconds > 0}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t.tryAgain}
                    </Button>
                    <Button
                      onClick={() => exportAnalysis("docx")}
                      disabled={!displayResult || loading || translating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs cursor-pointer"
                    >
                      {t.exportDocx}
                    </Button>
                    <Button
                      onClick={() => exportAnalysis("pdf")}
                      disabled={!displayResult || loading || translating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs cursor-pointer"
                    >
                      {t.exportPdf}
                    </Button>
                  </CardContent>
                </Card>

                {typeof displayResult?.ats_score === "number" && (
                  <Card className="bg-card border-border/80 shadow-sm">
                    <CardHeader className="py-4 border-b border-border/60">
                      <CardTitle className="text-base text-foreground">{t.atsTitle}</CardTitle>
                      <CardDescription className="text-muted-foreground">{t.atsDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="py-5">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-primary">{displayResult.ats_score}/100</div>
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, displayResult.ats_score))}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-card border-border/80 shadow-lg overflow-hidden">
                  <CardHeader className="border-b border-border/70 bg-muted/40 py-5">
                    <CardTitle className="text-base flex items-center gap-2 text-foreground">
                      {translating ? (
                        <TriangleAlert className="text-amber-500 shrink-0" size={20} />
                      ) : (
                        <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                      )}
                      {translating
                        ? `${t.translating} (${t.etaPrefix.toLowerCase()} ${translationEta || 1}${t.secondsShort})`
                        : t.extractedEntities}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/70">
                          <TableHead className="font-semibold text-foreground py-4 px-6 h-auto">{t.entityFocus}</TableHead>
                          <TableHead className="font-semibold text-foreground py-4 px-6 h-auto">{t.businessContext}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayResult.entities?.map((e, idx) => (
                          <TableRow key={idx} className="border-border/60 hover:bg-muted/30">
                            <TableCell className="font-medium text-foreground px-6 py-5 w-1/3 whitespace-normal">
                              <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded bg-primary/10 text-primary border border-primary/20 shadow-sm">{e.fact}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground px-6 py-5 leading-relaxed whitespace-normal">{e.so_what}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-lg">
                  <CardHeader className="py-5 border-b border-border/70">
                    <CardTitle className="text-lg text-foreground">{t.actionableSteps}</CardTitle>
                    <CardDescription className="text-muted-foreground">{t.actionableDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 bg-muted/20">
                    {displayResult.next_steps?.map((step, idx) => (
                      <div key={idx} className="flex gap-4 p-5 rounded-xl bg-card border border-border/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-300">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shadow-sm font-mono">
                          {idx + 1}
                        </div>
                        <p className="text-foreground font-medium text-sm pt-1 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                  </>
                )}

                {compareResult && (
                  <Card className="bg-card border-border/80 shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border/70 bg-muted/40 py-5">
                      <CardTitle className="text-base text-foreground">{t.comparisonOutput}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {t.verdict}: {compareResult.verdict}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 py-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.fileName}</TableHead>
                            <TableHead>{t.score}</TableHead>
                            <TableHead>{t.highlights}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareResult.files?.map((item, idx) => (
                            <TableRow key={`${item.filename}-${idx}`}>
                              <TableCell className="font-medium">{item.filename}</TableCell>
                              <TableCell>
                                <span
                                  className={
                                    item.filename === winnerFileName
                                      ? "bg-yellow-200/80 dark:bg-yellow-400/35 px-2 py-0.5 rounded font-semibold"
                                      : ""
                                  }
                                >
                                  {typeof item.ats_score === "number"
                                    ? `${item.ats_score}/100`
                                    : (typeof item.contract_score === "number" ? `${item.contract_score}/100` : "N/A")}
                                </span>
                              </TableCell>
                              <TableCell>{(item.highlights || []).join(" | ")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.attribute}</TableHead>
                            <TableHead>Values</TableHead>
                            <TableHead>{t.difference}</TableHead>
                            <TableHead>{t.assessment}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareResult.comparison_rows?.map((row, idx) => (
                            <TableRow key={`${row.attribute}-${idx}`}>
                              <TableCell className="font-medium">{row.attribute}</TableCell>
                              <TableCell>
                                {(() => {
                                  const betterFile = pickBetterValueFile(row.attribute, row.values_by_file || {});
                                  return (
                                    <div className="space-y-1">
                                      {Object.entries(row.values_by_file || {}).map(([name, value], valueIdx) => (
                                        <div key={`${row.attribute}-${name}-${valueIdx}`}>
                                          <span className="font-semibold">{name}:</span>{" "}
                                          <span
                                            className={
                                              betterFile && name === betterFile
                                                ? "bg-yellow-200/80 dark:bg-yellow-400/35 px-2 py-0.5 rounded"
                                                : ""
                                            }
                                          >
                                            {value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>{row.difference}</TableCell>
                              <TableCell>{row.assessment}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                {multiAnalyzeResults.length > 0 && (
                  <Card className="bg-card border-border/80 shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border/70 bg-muted/40 py-5">
                      <CardTitle className="text-base text-foreground">Multi-Document Analysis</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Individual analysis results for selected documents.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 py-6">
                      {multiAnalyzeResults.map((item, idx) => (
                        <div key={`${item.fileName}-${idx}`} className="p-4 rounded-lg border border-border/70 bg-muted/20">
                          <p className="text-sm font-semibold text-foreground">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {typeof item.data?.ats_score === "number" ? `ATS: ${item.data.ats_score}/100` : "Detection disabled"}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
