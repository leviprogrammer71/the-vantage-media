import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import { ArrowRight, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Submit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    businessName: "",
    phone: "",
    projectDescription: "",
    additionalNotes: "",
  });

  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAfterPhotos(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload photos to storage
      const photoPaths: string[] = [];
      for (const file of afterPhotos) {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop();
        const path = `submissions/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("project-submissions")
          .upload(path, file);

        if (!uploadError) {
          photoPaths.push(path);
        }
      }

      // Insert submission
      const { error } = await supabase.from("submissions").insert({
        full_name: formData.fullName,
        email: formData.email,
        business_name: formData.businessName,
        phone: formData.phone || null,
        transformation_type: "before-after",
        project_description: formData.projectDescription,
        video_style: "cinematic",
        after_photo_paths: photoPaths.length > 0 ? photoPaths : null,
        additional_notes: formData.additionalNotes || null,
      });

      if (error) throw error;

      setSubmittedEmail(formData.email);
      setIsSuccess(true);

      // Trigger confirmation email
      try {
        await supabase.functions.invoke("send-confirmation", {
          body: { email: formData.email, name: formData.fullName },
        });
      } catch {
        // Non-blocking
      }

      toast.success("Project submitted successfully!");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <Helmet>
          <title>Project Received | The Vantage</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="px-4 py-20 max-w-xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
              <h1 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-4">
                WE'VE GOT YOUR PROJECT.
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-4 max-w-md mx-auto leading-relaxed">
                We'll review your photos and have your transformation video ready within 5 business days.
                A confirmation email is on its way to {submittedEmail}.
              </p>
              <p className="text-xs font-mono text-primary">
                GREAT WORK GETS SEEN. YOURS WILL TOO.
              </p>
            </motion.div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Submit Your Project | The Vantage</title>
        <meta name="description" content="Fill in your project details and upload your after photos. We handle everything from there." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-4 py-12 md:py-20 max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-2">
              LET'S BUILD YOUR VIDEO
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Fill in your project details and upload your after photos. We handle everything from there.
            </p>
          </motion.div>

          <Card>
            <CardContent className="p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Your company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description *</Label>
                  <Textarea
                    id="projectDescription"
                    name="projectDescription"
                    required
                    value={formData.projectDescription}
                    onChange={handleChange}
                    placeholder="Tell us about your transformation — what was the project, what changed, and what makes it special?"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="afterPhotos">After Photos</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("afterPhotos")?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, HEIC up to 10MB each
                    </p>
                    {afterPhotos.length > 0 && (
                      <p className="text-xs text-primary mt-2">
                        {afterPhotos.length} file{afterPhotos.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>
                  <input
                    id="afterPhotos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes (optional)</Label>
                  <Textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    placeholder="Any specific style preferences, music, or details you'd like us to know?"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base py-6 rounded-xl group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Your Project
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Submit;
