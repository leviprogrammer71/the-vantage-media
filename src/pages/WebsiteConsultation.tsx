import { useState } from "react";
import { Globe, Sparkles, CheckCircle2, Loader2, AlertCircle, ArrowRight, Coins, Download, FileText, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CreditCost } from "@/components/CreditCost";
import { useCredits } from "@/hooks/useCredits";


interface ConsultationReport {
  overallScore: number;
  summary: string;
  categories: {
    name: string;
    score: number;
    findings: string[];
    recommendations: string[];
  }[];
  quickWins: string[];
  longTermStrategies: string[];
}

type ConsultationType = "quick" | "full" | "growth";

const consultationTypes = [
  {
    id: "quick" as ConsultationType,
    name: "Quick Audit",
    description: "Fast overview of key issues",
    credits: 1,
  },
  {
    id: "full" as ConsultationType,
    name: "Full Review",
    description: "Complete website & funnel analysis",
    credits: 3,
  },
  {
    id: "growth" as ConsultationType,
    name: "Growth Strategy",
    description: "In-depth launch & growth plan",
    credits: 5,
  },
];

const WebsiteConsultation = () => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ConsultationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ConsultationType>("full");

  const currentConsultation = consultationTypes.find(t => t.id === selectedType)!;

  const handleAnalyze = async () => {
    if (!user) {
      toast.error("Please sign in to use this feature");
      return;
    }

    if (!websiteUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    if (!contactEmail) {
      toast.error("Please enter your email address");
      return;
    }

    if (!businessDescription) {
      toast.error("Please provide a brief business description");
      return;
    }

    // Check credits
    if (credits !== null && credits < currentConsultation.credits) {
      toast.error(`You need ${currentConsultation.credits} credits for this consultation`);
      return;
    }

    // Validate URL
    let url = websiteUrl;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid website URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("website-consultation", {
        body: {
          websiteUrl: url,
        }
      });

      if (fnError) throw fnError;

      if (data?.report) {
        setReport(data.report);
        toast.success("Analysis complete!");
      } else {
        throw new Error("No report data received");
      }
    } catch (err) {
      console.error("Consultation error:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze website");
      toast.error("Failed to analyze website. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePDF = () => {
    if (!report) return;

    const html = `
      <!DOCTYPE html>
      <html><head><title>Website Consultation Report</title>
      <style>
        body { font-family: Helvetica, Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.5; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        h2 { font-size: 16px; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
        .score { font-size: 20px; font-weight: bold; margin: 10px 0; }
        ul { padding-left: 20px; }
        li { margin-bottom: 4px; }
        .footer { font-size: 10px; color: #999; margin-top: 40px; font-style: italic; }
        @media print { body { margin: 20px; } }
      </style></head><body>
        <h1>Website Consultation Report</h1>
        <div class="meta">
          <p>Website: ${websiteUrl}</p>
          <p>Email: ${contactEmail}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="score">Overall Score: ${report.overallScore}/100</div>
        <p>${report.summary}</p>
        ${report.categories.map(cat => `
          <h2>${cat.name} — Score: ${cat.score}/100</h2>
          ${cat.findings.length ? `<p><strong>Findings:</strong></p><ul>${cat.findings.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
          ${cat.recommendations.length ? `<p><strong>Recommendations:</strong></p><ul>${cat.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
        `).join('')}
        ${report.quickWins.length ? `<h2>Quick Wins</h2><ul>${report.quickWins.map(w => `<li>✓ ${w}</li>`).join('')}</ul>` : ''}
        ${report.longTermStrategies.length ? `<h2>Long-Term Strategies</h2><ul>${report.longTermStrategies.map(s => `<li>→ ${s}</li>`).join('')}</ul>` : ''}
        <div class="footer">Generated by TheVantage - thevantage.media</div>
      </body></html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success("PDF ready to save!");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10 border-green-500/20";
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <>
      <Helmet>
        <title>Website Consultation - TheVantage | AI-Powered Real Estate Website Analysis</title>
        <meta
          name="description"
          content="Get AI-powered recommendations to improve your real estate website. Analyze SEO, lead generation, user experience, and conversion optimization."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <LuxuryHeader variant="bone" />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Analysis
              </Badge>
              <h1 className="font-display font-bold text-4xl md:text-5xl mb-4">
                Website Consultation
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Get personalized AI recommendations to improve your real estate website's 
                performance, SEO, and lead generation.
              </p>
            </motion.div>

            {/* Consultation Type Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mb-6"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Choose Consultation Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {consultationTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        disabled={isAnalyzing}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedType === type.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        } ${isAnalyzing ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{type.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            <Coins className="h-3 w-3 mr-1" />
                            {type.credits}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Enter Your Website Details
                  </CardTitle>
                  <CardDescription>
                    We'll analyze your website and provide actionable recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!user ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        Sign in to use the website consultation feature
                      </p>
                      <Button asChild>
                        <Link to="/auth">Sign In</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="website-url" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Website URL
                          </Label>
                          <Input
                            id="website-url"
                            type="url"
                            placeholder="https://yourwebsite.com"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={isAnalyzing}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contact-email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Your Email Address
                          </Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="you@example.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            disabled={isAnalyzing}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="business-description" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Business Description
                          </Label>
                          <Textarea
                            id="business-description"
                            placeholder="Briefly describe your business, target audience, and goals..."
                            value={businessDescription}
                            onChange={(e) => setBusinessDescription(e.target.value)}
                            disabled={isAnalyzing}
                            rows={3}
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing || !websiteUrl || !contactEmail || !businessDescription || (credits !== null && credits < currentConsultation.credits)}
                        className="w-full"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            Analyze Website
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>

                      {/* Credit Cost Display */}
                      <CreditCost
                        cost={currentConsultation.credits}
                        currentCredits={credits}
                        label={currentConsultation.name}
                        description="AI-powered insights on your website, media, or growth strategy."
                        variant="default"
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-red-500/20 bg-red-500/5 mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <p className="text-red-500">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Report Section */}
            {report && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                {/* Download Button */}
                <div className="flex justify-end">
                  <Button onClick={generatePDF} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF Report
                  </Button>
                </div>

                {/* Overall Score */}
                <Card className={`${getScoreBg(report.overallScore)} border`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Overall Score</h3>
                        <p className="text-muted-foreground">{report.summary}</p>
                      </div>
                      <div className={`text-5xl font-bold ${getScoreColor(report.overallScore)}`}>
                        {report.overallScore}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <div className="grid md:grid-cols-2 gap-6">
                  {report.categories.map((category, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <Badge variant="outline" className={getScoreColor(category.score)}>
                            {category.score}/100
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {category.findings.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Findings</h4>
                            <ul className="space-y-2">
                              {category.findings.map((finding, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {category.recommendations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recommendations</h4>
                            <ul className="space-y-2">
                              {category.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick Wins */}
                {report.quickWins.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Quick Wins
                      </CardTitle>
                      <CardDescription>
                        Low-effort changes that can have immediate impact
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {report.quickWins.map((win, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Long Term Strategies */}
                {report.longTermStrategies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Long-Term Strategies</CardTitle>
                      <CardDescription>
                        Strategic improvements for sustained growth
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {report.longTermStrategies.map((strategy, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                            <span>{strategy}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Features Section */}
            {!report && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid md:grid-cols-3 gap-6 mt-12"
              >
                {[
                  {
                    title: "SEO Analysis",
                    description: "Analyze meta tags, keywords, and search engine optimization"
                  },
                  {
                    title: "Lead Generation",
                    description: "Evaluate contact forms, CTAs, and conversion elements"
                  },
                  {
                    title: "User Experience",
                    description: "Assess navigation, mobile responsiveness, and page speed"
                  },
                  {
                    title: "Content Quality",
                    description: "Review property listings, images, and descriptions"
                  },
                  {
                    title: "Trust Signals",
                    description: "Check testimonials, certifications, and credibility elements"
                  },
                  {
                    title: "Competitive Edge",
                    description: "Identify opportunities to stand out from competitors"
                  }
                ].map((feature, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </div>
        </main>
        <LuxuryFooter />
      </div>
    </>
  );
};

export default WebsiteConsultation;