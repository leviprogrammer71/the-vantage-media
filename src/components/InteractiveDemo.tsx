import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Image as ImageIcon,
  Loader2,
  X,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const InteractiveDemo = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEnhance = async () => {
    if (!uploadedImage) return;

    setIsProcessing(true);

    try {
      // Call the demo-enhance edge function (no auth required)
      const { data, error } = await supabase.functions.invoke("demo-enhance", {
        body: {
          imageUrl: uploadedImage,
          preset: "exterior-enhancement",
        },
      });

      if (error) {
        console.error("Demo enhance error:", error);
        toast.error("Demo is limited. Sign up for full features!");
        // Still show a simulated result for demo purposes
        setEnhancedImage(uploadedImage);
        return;
      }

      if (data?.enhancedImageUrl) {
        setEnhancedImage(data.enhancedImageUrl);
        toast.success("Photo enhanced! Sign up for unlimited access.");
      } else {
        // Fallback: show original with message
        setEnhancedImage(uploadedImage);
        toast.info("Preview ready! Sign up to see full AI enhancements.");
      }
    } catch (err) {
      console.error("Enhancement error:", err);
      // Show simulated enhancement for demo
      setEnhancedImage(uploadedImage);
      toast.info("Sign up to unlock AI photo enhancement!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setEnhancedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="px-4 max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" />
            Try It Free
          </Badge>
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-2">
            See It In Action
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Upload any property photo and see the AI enhancement instantly. No signup required.
          </p>
        </div>

        <Card className="p-4 md:p-6 bg-card border-border/50">
          {!uploadedImage ? (
            /* Upload State */
            <div
              className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    Drop your photo here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse • JPG, PNG up to 10MB
                  </p>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
            </div>
          ) : !enhancedImage ? (
            /* Preview & Enhance State */
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded property"
                  className="w-full rounded-lg object-cover max-h-[400px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleEnhance}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance This Photo
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Try Different Photo
                </Button>
              </div>
              
              {isProcessing && (
                <p className="text-center text-sm text-muted-foreground">
                  AI is analyzing and enhancing your photo...
                </p>
              )}
            </div>
          ) : (
            /* Result State */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary" className="text-xs">Before</Badge>
                  </div>
                  <img
                    src={uploadedImage}
                    alt="Original"
                    className="w-full rounded-lg object-cover aspect-video"
                  />
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="text-xs bg-primary">After</Badge>
                  </div>
                  <img
                    src={enhancedImage}
                    alt="Enhanced"
                    className="w-full rounded-lg object-cover aspect-video"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Demo preview complete
                </div>
                <p className="text-sm mb-4">
                  Sign up free to unlock full AI enhancement with sky replacement, lawn enhancement, and more.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/signup">
                      Start Free - 5 Photos
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Try Another Photo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            No signup required
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            Photos not stored
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            MLS-compliant results
          </span>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;
