import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { mockPackages } from '@/data/mock-portal-data';
import {
  Camera, Globe, FileText, Layers, Zap, Check,
  ArrowRight, Star, Sparkles
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  brand_photography: <Camera className="h-6 w-6" />,
  website: <Globe className="h-6 w-6" />,
  content_strategy: <FileText className="h-6 w-6" />,
  full_ecosystem: <Layers className="h-6 w-6" />,
  automation: <Zap className="h-6 w-6" />,
};

const highlightPackage = 'full_ecosystem';

export default function ServicePricing() {
  const navigate = useNavigate();
  const [hoveredPkg, setHoveredPkg] = useState<string | null>(null);

  const handleGetStarted = (packageType: string) => {
    navigate(`/onboarding?package=${packageType}`);
  };

  return (
    <div className="min-h-screen" style={{ background: '#1A1A2E' }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
        <Badge
          className="mb-4 text-xs tracking-wider uppercase px-3 py-1"
          style={{ background: 'rgba(233,69,96,0.15)', color: '#E94560', border: '1px solid rgba(233,69,96,0.3)' }}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Services & Pricing
        </Badge>
        <h1
          className="text-4xl md:text-5xl font-serif font-bold mb-4"
          style={{ color: '#F7F5F2' }}
        >
          Build Your Brand's Digital Presence
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: '#B8B8CC' }}>
          From photography to full digital ecosystems — choose the package that fits
          your vision and let us handle the rest.
        </p>
      </div>

      {/* Packages Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPackages.map((pkg) => {
            const isHighlight = pkg.package_type === highlightPackage;
            const isHovered = hoveredPkg === pkg.id;

            return (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden transition-all duration-300 border ${
                  isHighlight
                    ? 'border-[#E94560]/50 shadow-lg shadow-[#E94560]/10'
                    : 'border-white/10'
                } ${isHovered ? 'scale-[1.02] shadow-xl' : ''}`}
                style={{ background: '#16213E' }}
                onMouseEnter={() => setHoveredPkg(pkg.id)}
                onMouseLeave={() => setHoveredPkg(null)}
              >
                {isHighlight && (
                  <div
                    className="absolute top-0 left-0 right-0 text-center text-xs font-semibold py-1.5 tracking-wider uppercase"
                    style={{ background: '#E94560', color: '#fff' }}
                  >
                    <Star className="h-3 w-3 inline mr-1" />
                    Most Popular
                  </div>
                )}

                <CardHeader className={isHighlight ? 'pt-10' : 'pt-6'}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="p-2.5 rounded-lg"
                      style={{
                        background: isHighlight ? 'rgba(233,69,96,0.15)' : 'rgba(184,184,204,0.1)',
                        color: isHighlight ? '#E94560' : '#B8B8CC',
                      }}
                    >
                      {iconMap[pkg.package_type] || <Globe className="h-6 w-6" />}
                    </div>
                    <CardTitle className="text-lg" style={{ color: '#F7F5F2' }}>
                      {pkg.name}
                    </CardTitle>
                  </div>
                  <p className="text-sm" style={{ color: '#B8B8CC' }}>
                    {pkg.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Price */}
                  <div>
                    <span className="text-3xl font-bold" style={{ color: '#F7F5F2' }}>
                      ${pkg.price.toLocaleString()}
                    </span>
                  </div>

                  <Separator style={{ background: 'rgba(255,255,255,0.08)' }} />

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className="h-4 w-4 mt-0.5 flex-shrink-0"
                          style={{ color: isHighlight ? '#E94560' : '#10B981' }}
                        />
                        <span style={{ color: '#B8B8CC' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className="w-full mt-4 font-semibold transition-all duration-200"
                    style={
                      isHighlight
                        ? { background: '#E94560', color: '#fff' }
                        : { background: 'rgba(233,69,96,0.1)', color: '#E94560', border: '1px solid rgba(233,69,96,0.3)' }
                    }
                    onClick={() => handleGetStarted(pkg.package_type)}
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-10" style={{ color: '#F7F5F2' }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Choose', desc: 'Select the package that fits your needs' },
            { step: '02', title: 'Intake', desc: 'Tell us about your business and goals' },
            { step: '03', title: 'Create', desc: 'We design, build, and photograph' },
            { step: '04', title: 'Review', desc: 'You review and we refine together' },
            { step: '05', title: 'Launch', desc: 'Go live with full support' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div
                className="text-xs font-bold mb-2 tracking-widest"
                style={{ color: '#E94560' }}
              >
                {item.step}
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#F7F5F2' }}>
                {item.title}
              </div>
              <p className="text-xs" style={{ color: '#6B6B80' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Bottom */}
      <div className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <Card
          className="border p-8 md:p-12"
          style={{ background: '#16213E', borderColor: 'rgba(233,69,96,0.2)' }}
        >
          <h3 className="text-2xl font-serif font-bold mb-3" style={{ color: '#F7F5F2' }}>
            Not sure which package is right?
          </h3>
          <p className="mb-6" style={{ color: '#B8B8CC' }}>
            Let's talk. We'll find the right combination of services for your business.
          </p>
          <Button
            size="lg"
            style={{ background: '#E94560', color: '#fff' }}
            onClick={() => navigate('/contact')}
          >
            Book a Free Consultation
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
