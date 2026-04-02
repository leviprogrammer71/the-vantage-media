import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check, Gift, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Referral = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReferralCode();
      fetchReferralCount();
    }
  }, [user]);

  const fetchReferralCode = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_or_create_referral_code", { p_user_id: user.id });
    if (data) setReferralCode(data as string);
  };

  const fetchReferralCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .eq("status", "converted");
    setReferralCount(count || 0);
  };

  const shareUrl = referralCode ? `${window.location.origin}/?ref=${referralCode}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!", description: "Share it with friends to earn credits." });
  };

  const handleApplyCode = async () => {
    if (!user || !applyCode.trim()) return;
    setApplying(true);
    try {
      // Find the referral
      const { data: ref, error: findErr } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", applyCode.trim())
        .eq("status", "pending")
        .is("referred_user_id", null)
        .single();

      if (findErr || !ref) {
        toast({ title: "Invalid code", description: "This referral code is not valid or has already been used.", variant: "destructive" });
        return;
      }

      if (ref.referrer_id === user.id) {
        toast({ title: "Can't use your own code", description: "You can't refer yourself.", variant: "destructive" });
        return;
      }

      // Update the referral
      await supabase
        .from("referrals")
        .update({
          referred_user_id: user.id,
          status: "converted",
          converted_at: new Date().toISOString(),
          credits_awarded: true,
        })
        .eq("id", ref.id);

      // Award credits to both users
      await supabase.rpc("increment_credits", { p_user_id: user.id, p_amount: 5 });
      await supabase.rpc("increment_credits", { p_user_id: ref.referrer_id, p_amount: 5 });

      // Log transactions
      await supabase.from("credit_transactions").insert([
        { user_id: user.id, credits_amount: 5, transaction_type: "referral_bonus", description: "Referral code applied" },
        { user_id: ref.referrer_id, credits_amount: 5, transaction_type: "referral_bonus", description: "Friend used your referral code" },
      ]);

      toast({ title: "🎉 5 credits added!", description: "Both you and the referrer earned 5 credits." });
      setApplyCode("");
    } catch (err) {
      console.error("Apply referral error:", err);
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Helmet><title>Referrals — The Vantage</title></Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 pt-24 max-w-lg">
          <div className="text-center mb-8">
            <Gift className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              GIVE 5, GET 5
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Share your referral link. When a friend signs up and creates their first video, you both get 5 free credits.
            </p>
          </div>

          <div className="space-y-6">
            {/* Your link */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Your Referral Link</h2>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="font-mono text-xs"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{referralCount} friend{referralCount !== 1 ? "s" : ""} referred</span>
                </div>
              </CardContent>
            </Card>

            {/* Apply a code */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Have a Referral Code?</h2>
                <div className="flex gap-2">
                  <Input
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value)}
                    placeholder="Enter code"
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleApplyCode} disabled={applying || !applyCode.trim()}>
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Referral;
