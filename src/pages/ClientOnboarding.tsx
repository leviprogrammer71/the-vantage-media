import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  Zap,
  CheckCircle2,
  ArrowRight,
  Globe,
  Palette,
  TrendingUp,
  Sparkles,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { mockPackages } from '@/data/mock-portal-data';
import type { Package } from '@/types/portal';

// Define step types
type Step = 1 | 2 | 3 | 4;
type PackageType = 'website' | 'brand_photography' | 'content_strategy' | 'full_ecosystem';

// Onboarding phase definitions
const PHASES = [
  { id: 1, name: 'Discovery & Intake', icon: BookOpen, color: 'text-blue-400' },
  { id: 2, name: 'Photography/Content', icon: Camera, color: 'text-purple-400' },
  { id: 3, name: 'Design & Build', icon: Palette, color: 'text-pink-400' },
  { id: 4, name: 'Review & Revise', icon: CheckCircle2, color: 'text-yellow-400' },
  { id: 5, name: 'Launch & Handoff', icon: Zap, color: 'text-green-400' },
];

// Form field configurations by package type
const PACKAGE_FORM_FIELDS = {
  common: [
    { name: 'businessName', label: 'Business Name', type: 'text', required: true },
    { name: 'industry', label: 'Industry/Business Type', type: 'text', required: true },
    { name: 'targetAudience', label: 'Target Audience', type: 'text', required: true },
    { name: 'competitors', label: 'Main Competitors (list a few)', type: 'textarea', required: true },
    { name: 'brandColors', label: 'Brand Color Preferences', type: 'text', required: false },
    { name: 'additionalNotes', label: 'Additional Notes', type: 'textarea', required: false },
  ],
  website: [
    { name: 'pagesNeeded', label: 'Pages Needed', type: 'checkboxes', options: ['Home', 'About', 'Services', 'Gallery', 'Contact', 'Blog', 'Testimonials'], required: true },
    { name: 'features', label: 'Must-Have Features', type: 'checkboxes', options: ['Contact form', 'E-commerce', 'Booking system', 'Payment processing', 'Newsletter signup', 'Image gallery'], required: true },
    { name: 'hasContent', label: 'Do you have existing content/copy?', type: 'radio', options: ['Yes', 'No'], required: true },
  ],
  brand_photography: [
    { name: 'location', label: 'Preferred Location', type: 'text', required: true },
    { name: 'numShots', label: 'Number of Edited Photos Needed', type: 'select', options: ['15-20', '20-30', '30-50', '50+'], required: true },
    { name: 'teamMembers', label: 'Team Members to Photograph', type: 'textarea', required: false },
  ],
  content_strategy: [
    { name: 'socialPlatforms', label: 'Social Media Platforms', type: 'checkboxes', options: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter/X', 'TikTok', 'YouTube'], required: true },
    { name: 'contentBefore', label: 'Have you created content before?', type: 'radio', options: ['Yes', 'No', 'Some'], required: true },
    { name: 'contentGoals', label: 'Content Goals & Objectives', type: 'textarea', required: true },
  ],
  full_ecosystem: [], // Combines all others
};

interface FormData {
  // Common fields
  businessName: string;
  industry: string;
  targetAudience: string;
  competitors: string;
  brandColors: string;
  additionalNotes: string;

  // Website fields
  pagesNeeded: string[];
  features: string[];
  hasContent: string;

  // Photography fields
  location: string;
  numShots: string;
  teamMembers: string;

  // Content fields
  socialPlatforms: string[];
  contentBefore: string;
  contentGoals: string;
}

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPackage = (searchParams.get('package') as PackageType) || 'website';

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedPackageType, setSelectedPackageType] = useState<PackageType>(initialPackage);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    industry: '',
    targetAudience: '',
    competitors: '',
    brandColors: '',
    additionalNotes: '',
    pagesNeeded: [],
    features: [],
    hasContent: '',
    location: '',
    numShots: '',
    teamMembers: '',
    socialPlatforms: [],
    contentBefore: '',
    contentGoals: '',
  });

  // Load selected package data
  const getPackageForType = (type: PackageType): Package | null => {
    return mockPackages.find(p => p.package_type === type) || null;
  };

  // Update selected package when type changes
  const handlePackageTypeChange = (type: PackageType) => {
    setSelectedPackageType(type);
    setSelectedPackage(getPackageForType(type));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (fieldName: string, value: string) => {
    setFormData(prev => {
      const fieldArray = prev[fieldName as keyof FormData] as string[];
      if (fieldArray.includes(value)) {
        return {
          ...prev,
          [fieldName]: fieldArray.filter(v => v !== value),
        };
      }
      return {
        ...prev,
        [fieldName]: [...fieldArray, value],
      };
    });
  };

  const handleRadioChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSelectChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleCompleteOnboarding = () => {
    navigate('/client-dashboard');
  };

  // Initialize package on mount
  const pkg = selectedPackage || getPackageForType(selectedPackageType);

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A2E' }}>
      {/* Header with step indicator */}
      <div className="sticky top-0 z-50 border-b" style={{ borderColor: '#16213E', backgroundColor: '#1A1A2E' }}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">The Vantage</h1>
              <p className="text-gray-400 text-sm">Client Onboarding</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-300">Step {currentStep} of 4</p>
              <p className="text-xs text-gray-500">
                {currentStep === 1 && 'Welcome'}
                {currentStep === 2 && 'Intake Form'}
                {currentStep === 3 && 'Confirm Package'}
                {currentStep === 4 && 'Success'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progressPercentage} className="h-2" style={{ backgroundColor: '#16213E' }} />

          {/* Step indicators */}
          <div className="flex justify-between mt-6">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => step < currentStep && setCurrentStep(step as Step)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step <= currentStep
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                  style={{
                    backgroundColor: step <= currentStep ? '#E94560' : '#16213E',
                  }}
                >
                  {step < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {['Welcome', 'Intake', 'Confirm', 'Done'][step - 1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* STEP 1: Welcome & Timeline */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560', borderWidth: '1px' }}>
              <CardHeader>
                <CardTitle className="text-3xl text-white mb-2">Welcome to The Vantage</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Here's how working with us works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Timeline visualization */}
                <div className="py-8">
                  <div className="space-y-6">
                    {PHASES.map((phase, index) => {
                      const IconComponent = phase.icon;
                      return (
                        <div key={phase.id} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${phase.color}`}
                              style={{ backgroundColor: '#16213E' }}
                            >
                              <IconComponent className="w-6 h-6" />
                            </div>
                            {index < PHASES.length - 1 && (
                              <div
                                className="w-1 h-12 mt-2"
                                style={{ backgroundColor: '#E94560' }}
                              />
                            )}
                          </div>
                          <div className="flex-1 pt-2">
                            <h3 className="font-semibold text-white text-lg">{phase.name}</h3>
                            <p className="text-gray-400 text-sm mt-1">
                              {phase.id === 1 && 'We learn about your business, goals, and vision.'}
                              {phase.id === 2 && 'We capture stunning visuals and develop your content strategy.'}
                              {phase.id === 3 && 'Our design and development teams create your digital presence.'}
                              {phase.id === 4 && 'You review everything. We refine based on your feedback.'}
                              {phase.id === 5 && 'We launch your project and provide comprehensive training.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex justify-end pt-6">
                  <Button
                    onClick={goToNextStep}
                    size="lg"
                    style={{ backgroundColor: '#E94560' }}
                    className="text-white hover:opacity-90"
                  >
                    Let's Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: Intake Form */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <div className="space-y-6">
              {/* Package selector if not pre-selected */}
              {!searchParams.get('package') && (
                <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560', borderWidth: '1px' }}>
                  <CardHeader>
                    <CardTitle className="text-white">Select Your Package</CardTitle>
                    <CardDescription className="text-gray-300">
                      Choose the package that fits your needs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {mockPackages.filter(p => p.is_active).map(pkg => (
                        <button
                          key={pkg.id}
                          onClick={() => handlePackageTypeChange(pkg.package_type as PackageType)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedPackageType === pkg.package_type
                              ? 'border-red-500 bg-opacity-50'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          style={{
                            backgroundColor:
                              selectedPackageType === pkg.package_type
                                ? 'rgba(233, 69, 96, 0.1)'
                                : '#16213E',
                          }}
                        >
                          <h4 className="font-semibold text-white text-sm">{pkg.name}</h4>
                          <p className="text-red-400 font-bold mt-2">${pkg.price}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main intake form */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560', borderWidth: '1px' }}>
                <CardHeader>
                  <CardTitle className="text-white">Tell Us About Your Business</CardTitle>
                  <CardDescription className="text-gray-300">
                    Help us understand your needs so we can deliver the best results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Common fields */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300" htmlFor="businessName">
                        Business Name *
                      </Label>
                      <Input
                        id="businessName"
                        name="businessName"
                        placeholder="e.g., Valley Cabinets"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                        className="text-white placeholder-gray-600 mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300" htmlFor="industry">
                          Industry/Business Type *
                        </Label>
                        <Input
                          id="industry"
                          name="industry"
                          placeholder="e.g., Construction, Retail"
                          value={formData.industry}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300" htmlFor="targetAudience">
                          Target Audience *
                        </Label>
                        <Input
                          id="targetAudience"
                          name="targetAudience"
                          placeholder="e.g., Homeowners aged 35-65"
                          value={formData.targetAudience}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300" htmlFor="competitors">
                        Main Competitors *
                      </Label>
                      <Textarea
                        id="competitors"
                        name="competitors"
                        placeholder="List 2-3 competitors. What do they do well? What are they missing?"
                        value={formData.competitors}
                        onChange={handleInputChange}
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                        className="text-white placeholder-gray-600 mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300" htmlFor="brandColors">
                          Brand Color Preferences
                        </Label>
                        <Input
                          id="brandColors"
                          name="brandColors"
                          placeholder="e.g., Navy blue, gold accents"
                          value={formData.brandColors}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300" htmlFor="additionalNotes">
                        Additional Notes
                      </Label>
                      <Textarea
                        id="additionalNotes"
                        name="additionalNotes"
                        placeholder="Anything else we should know?"
                        value={formData.additionalNotes}
                        onChange={handleInputChange}
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                        className="text-white placeholder-gray-600 mt-1"
                        rows={3}
                      />
                    </div>
                  </div>

                  <Separator style={{ borderColor: '#16213E' }} />

                  {/* Package-specific fields */}
                  {selectedPackageType === 'website' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Website Details</h3>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Pages Needed *</Label>
                        <div className="space-y-2">
                          {['Home', 'About', 'Services', 'Gallery', 'Contact', 'Blog', 'Testimonials'].map(
                            page => (
                              <div key={page} className="flex items-center gap-2">
                                <Checkbox
                                  id={`page-${page}`}
                                  checked={formData.pagesNeeded.includes(page)}
                                  onCheckedChange={() =>
                                    handleCheckboxChange('pagesNeeded', page)
                                  }
                                />
                                <label
                                  htmlFor={`page-${page}`}
                                  className="text-gray-300 cursor-pointer"
                                >
                                  {page}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Must-Have Features *</Label>
                        <div className="space-y-2">
                          {['Contact form', 'E-commerce', 'Booking system', 'Payment processing', 'Newsletter signup', 'Image gallery'].map(
                            feature => (
                              <div key={feature} className="flex items-center gap-2">
                                <Checkbox
                                  id={`feature-${feature}`}
                                  checked={formData.features.includes(feature)}
                                  onCheckedChange={() =>
                                    handleCheckboxChange('features', feature)
                                  }
                                />
                                <label
                                  htmlFor={`feature-${feature}`}
                                  className="text-gray-300 cursor-pointer"
                                >
                                  {feature}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Do you have existing content? *</Label>
                        <RadioGroup value={formData.hasContent} onValueChange={(value) => handleRadioChange('hasContent', value)}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="Yes" id="content-yes" />
                            <label htmlFor="content-yes" className="text-gray-300 cursor-pointer">
                              Yes, we have copy and images ready
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="No" id="content-no" />
                            <label htmlFor="content-no" className="text-gray-300 cursor-pointer">
                              No, we need help with content
                            </label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}

                  {selectedPackageType === 'brand_photography' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Photography Details</h3>

                      <div>
                        <Label className="text-gray-300" htmlFor="location">
                          Preferred Location *
                        </Label>
                        <Input
                          id="location"
                          name="location"
                          placeholder="e.g., Our showroom, office, outdoor location"
                          value={formData.location}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300" htmlFor="numShots">
                          Number of Edited Photos Needed *
                        </Label>
                        <Select value={formData.numShots} onValueChange={(value) => handleSelectChange('numShots', value)}>
                          <SelectTrigger style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }} className="text-white mt-1">
                            <SelectValue placeholder="Select quantity" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: '#16213E', borderColor: '#E94560' }}>
                            <SelectItem value="15-20" className="text-white">15-20 photos</SelectItem>
                            <SelectItem value="20-30" className="text-white">20-30 photos</SelectItem>
                            <SelectItem value="30-50" className="text-white">30-50 photos</SelectItem>
                            <SelectItem value="50+" className="text-white">50+ photos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-300" htmlFor="teamMembers">
                          Team Members to Photograph
                        </Label>
                        <Textarea
                          id="teamMembers"
                          name="teamMembers"
                          placeholder="Names and roles of team members (optional)"
                          value={formData.teamMembers}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {selectedPackageType === 'content_strategy' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Content Strategy Details</h3>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Social Media Platforms *</Label>
                        <div className="space-y-2">
                          {['Instagram', 'Facebook', 'LinkedIn', 'Twitter/X', 'TikTok', 'YouTube'].map(
                            platform => (
                              <div key={platform} className="flex items-center gap-2">
                                <Checkbox
                                  id={`platform-${platform}`}
                                  checked={formData.socialPlatforms.includes(platform)}
                                  onCheckedChange={() =>
                                    handleCheckboxChange('socialPlatforms', platform)
                                  }
                                />
                                <label
                                  htmlFor={`platform-${platform}`}
                                  className="text-gray-300 cursor-pointer"
                                >
                                  {platform}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Content Creation Experience *</Label>
                        <RadioGroup value={formData.contentBefore} onValueChange={(value) => handleRadioChange('contentBefore', value)}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="Yes" id="content-exp-yes" />
                            <label htmlFor="content-exp-yes" className="text-gray-300 cursor-pointer">
                              Yes, we've created content before
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="Some" id="content-exp-some" />
                            <label htmlFor="content-exp-some" className="text-gray-300 cursor-pointer">
                              Some, but we need help
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="No" id="content-exp-no" />
                            <label htmlFor="content-exp-no" className="text-gray-300 cursor-pointer">
                              No, we need full support
                            </label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-gray-300" htmlFor="contentGoals">
                          Content Goals & Objectives *
                        </Label>
                        <Textarea
                          id="contentGoals"
                          name="contentGoals"
                          placeholder="What do you want to achieve with your content? (e.g., build brand awareness, generate leads, engage community)"
                          value={formData.contentGoals}
                          onChange={handleInputChange}
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#E94560' }}
                          className="text-white placeholder-gray-600 mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {selectedPackageType === 'full_ecosystem' && (
                    <div className="rounded-lg p-4 bg-opacity-50" style={{ backgroundColor: 'rgba(233, 69, 96, 0.1)' }}>
                      <p className="text-gray-300">
                        <Sparkles className="w-5 h-5 inline mr-2 text-yellow-400" />
                        You've selected the Full Ecosystem package. Please fill in all fields above — we'll ask more detailed questions
                        about website, photography, and content strategy based on your answers.
                      </p>
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex justify-between pt-6">
                    <Button
                      onClick={goToPreviousStep}
                      variant="outline"
                      style={{ borderColor: '#E94560', color: '#E94560' }}
                      className="hover:bg-opacity-10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={goToNextStep}
                      style={{ backgroundColor: '#E94560' }}
                      className="text-white hover:opacity-90"
                    >
                      Review Package
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 3: Package & Pricing Confirmation */}
        {currentStep === 3 && pkg && (
          <div className="animate-fade-in">
            <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560', borderWidth: '1px' }}>
              <CardHeader>
                <CardTitle className="text-3xl text-white mb-2">{pkg.name}</CardTitle>
                <CardDescription className="text-gray-300">
                  Confirm your selection and agree to our terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Package details */}
                <div className="bg-opacity-20 rounded-lg p-6" style={{ backgroundColor: 'rgba(233, 69, 96, 0.1)' }}>
                  <div className="flex justify-between items-baseline mb-6 border-b pb-6" style={{ borderColor: '#16213E' }}>
                    <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-red-400">${pkg.price.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm mt-1">One-time investment</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      What's Included
                    </h4>
                    <ul className="space-y-3">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-300">
                          <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#E94560' }} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Summary of responses */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Your Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-opacity-10 rounded-lg p-4" style={{ backgroundColor: '#16213E' }}>
                    <div>
                      <p className="text-gray-500 text-sm">Business Name</p>
                      <p className="text-white font-medium">{formData.businessName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Industry</p>
                      <p className="text-white font-medium">{formData.industry}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Target Audience</p>
                      <p className="text-white font-medium">{formData.targetAudience}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Package Type</p>
                      <p className="text-white font-medium capitalize">{pkg.name}</p>
                    </div>
                  </div>
                </div>

                {/* Terms agreement */}
                <Separator style={{ borderColor: '#16213E' }} />

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    />
                    <label htmlFor="terms" className="text-gray-300 cursor-pointer text-sm leading-relaxed">
                      I agree to The Vantage Terms of Service and understand the project timeline, deliverables, and payment terms. I also consent to receive project updates and communications via email.
                    </label>
                  </div>

                  {termsAccepted && (
                    <div className="p-4 rounded-lg bg-opacity-20 border border-green-500 border-opacity-30" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                      <p className="text-green-400 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Terms accepted. You're ready to proceed!
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    onClick={goToPreviousStep}
                    variant="outline"
                    style={{ borderColor: '#E94560', color: '#E94560' }}
                    className="hover:bg-opacity-10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    disabled={!termsAccepted}
                    style={{
                      backgroundColor: termsAccepted ? '#E94560' : '#4B5563',
                    }}
                    className="text-white hover:opacity-90 disabled:cursor-not-allowed"
                  >
                    Proceed to Payment
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                <p className="text-center text-gray-500 text-xs">
                  Don't worry — your information is secure and encrypted.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4: Success */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560', borderWidth: '1px' }}>
              <CardContent className="py-16 text-center space-y-8">
                {/* Success animation */}
                <div className="flex justify-center">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center animate-bounce"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                  </div>
                </div>

                {/* Success message */}
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white">You're All Set!</h2>
                  <p className="text-xl text-gray-300">Your project has been created successfully</p>
                </div>

                {/* Next steps */}
                <div className="bg-opacity-10 rounded-lg p-6 max-w-lg mx-auto" style={{ backgroundColor: 'rgba(233, 69, 96, 0.1)' }}>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    What Happens Next
                  </h3>
                  <ul className="space-y-3 text-left text-gray-300">
                    <li className="flex gap-3">
                      <span className="font-bold text-red-400">1.</span>
                      <span>You'll receive a welcome email with your dashboard access</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-red-400">2.</span>
                      <span>We'll schedule your discovery call within 2 business days</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-red-400">3.</span>
                      <span>Track your project progress from start to finish in your dashboard</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-red-400">4.</span>
                      <span>Get exclusive access to video walkthroughs and live demos</span>
                    </li>
                  </ul>
                </div>

                {/* Dashboard button */}
                <div className="pt-6">
                  <Button
                    onClick={handleCompleteOnboarding}
                    size="lg"
                    style={{ backgroundColor: '#E94560' }}
                    className="text-white hover:opacity-90"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                {/* Contact info */}
                <div className="text-gray-400 text-sm">
                  <p>Questions? Email us at <span className="text-red-400">hello@thevantage.com</span> or call <span className="text-red-400">(555) 123-4567</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Custom styles for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ClientOnboarding;
