import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAI } from "@/contexts/AIContext";
import { useProjects } from "@/hooks/use-projects";
import { useProjectData, StepType, FormDataType } from "@/hooks/use-project-data";
import { useGeneratedAssets, AssetType } from "@/hooks/use-generated-assets";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { BusinessBasics } from "@/components/wizard/steps/BusinessBasics";
import { TargetAudience } from "@/components/wizard/steps/TargetAudience";
import { BrandPersonality, PersonalityTrait } from "@/components/wizard/steps/BrandPersonality";
import { BrandStory } from "@/components/wizard/steps/BrandStory";
import { Competition } from "@/components/wizard/steps/Competition";
import { Aesthetics } from "@/components/wizard/steps/Aesthetics";
import { LogoGeneration } from "@/components/wizard/steps/LogoGeneration";
import { Results } from "@/components/wizard/steps/Results";
// APIKeySetup import removed
import { BrandNameGenerator } from "@/components/ai/BrandNameGenerator";
import { BrandStatementGenerator } from "@/components/ai/BrandStatementGenerator";
import { ColorPaletteGenerator } from "@/components/ai/ColorPaletteGenerator";
import { GeneratedLogo } from "@/integrations/ai/ideogram";
import { GeneratedColorPalette } from "@/integrations/ai/colorPalette";
import { toast } from "sonner";
import { BrandNameGeneratorStep } from "@/components/wizard/steps/BrandNameGeneratorStep";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Define the form data type
export interface FormData extends FormDataType {
  industry: string;
  businessName: string;
  productService: string;
  uniqueSellingProposition: string;

  demographics: {  
    ageRange: string;
    gender: string;
    location: string;
    income: string;
    education: string;
  };
  psychographics: {
    interests: string[];
    values: string[];
    painPoints: string[];
    goals: string[];
  };

  personalityTraits: PersonalityTrait[];

  selectedArchetype: string;
  
  mission: string;
  vision: string;
  values: string[];
  originStory: string;

  competitors: Array<{
    name: string;
    strengths: string;
    weaknesses: string;
  }>;
  differentiators: string[];

  visualStyle: string;
  colorPreferences: string[];
  inspirationKeywords: string[];
  moodboardUrls: string[];
  logo: GeneratedLogo | null;
  brandName: string;

  aiGenerated: {
    brandName: string;
    mission: string;
    vision: string;
    valueProposition: string;
    brandEssence: string;
    brandVoice: string;
    colorPalette: GeneratedColorPalette | null;
    logo: GeneratedLogo | null;
  };
}

// Define the steps in order
const STEPS: string[] = [
  'basics',
  'brand-name-generator',
  'audience',
  'personality',
  'story',
  'competition',
  'aesthetics',
  'logo',
  'results'
];

// Define the initial form data
const INITIAL_FORM_DATA: FormData = {
  industry: "",
  businessName: "",
  productService: "",
  uniqueSellingProposition: "",

  demographics: {
    ageRange: "",
    gender: "",
    location: "",
    income: "",
    education: "",
  },
  psychographics: {
    interests: [],
    values: [],
    painPoints: [],
    goals: [],
  },

  personalityTraits: [
    { label: "Playfulness vs. Seriousness", value: 50 },
    { label: "Modern vs. Traditional", value: 50 },
    { label: "Luxurious vs. Accessible", value: 50 },
    { label: "Bold vs. Subtle", value: 50 },
    { label: "Formal vs. Relaxed", value: 50 },
  ],
  
  

  selectedArchetype: "",

  mission: "",
  vision: "",
  values: [],
  originStory: "",

  competitors: [],
  differentiators: [],

  visualStyle: "",
  colorPreferences: [],
  inspirationKeywords: [],
  moodboardUrls: [],

  brandName: "",
  logo: null,

  aiGenerated: {
    brandName: "",
    mission: "",
    vision: "",
    valueProposition: "",
    brandEssence: "",
    brandVoice: "",
    colorPalette: null,
    logo: null,
  }
};

// Update the component props interfaces
interface BusinessBasicsProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface TargetAudienceProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface BrandPersonalityProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface BrandStoryProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface CompetitionProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface AestheticsProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

interface WizardLayoutProps {
  currentStep: string;
  onNext: () => Promise<void>;
  onPrevious: () => void;
  canProceed: boolean;
  isSaving: boolean;
  children: React.ReactNode;
}

export default function BrandWizard() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [currentStep, setCurrentStep] = useState("basics");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [stepsValidity, setStepsValidity] = useState<Record<string, boolean>>({});
  // Track if step data has changed to avoid unnecessary saves
  const [stepDataCache, setStepDataCache] = useState<Record<string, any>>({});
  
  // Debug log for step data cache
  useEffect(() => {
    console.log('Step data cache updated:', Object.keys(stepDataCache));
  }, [stepDataCache]);
  
  // Helper function to normalize data for comparison
  const normalizeDataForComparison = useCallback((data: any): any => {
    // Handle null/undefined
    if (data === null || data === undefined) {
      return null;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(normalizeDataForComparison);
    }
    
    // Handle objects
    if (typeof data === 'object') {
      // Filter out empty values and sort keys
      const result: Record<string, any> = {};
      const keys = Object.keys(data).sort();
      
      for (const key of keys) {
        const value = data[key];
        
        // Skip null, undefined, empty strings, empty arrays, empty objects
        if (value === null || value === undefined) continue;
        if (value === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
        
        // Recursively normalize the value
        result[key] = normalizeDataForComparison(value);
      }
      
      return result;
    }
    
    // Return primitives as is
    return data;
  }, []);

  // Initialize hooks
  const { getProject } = useProjects();
  const { getStepData, saveStepData } = useProjectData(projectId);
  const { getAsset, saveAsset, getAllLogos } = useGeneratedAssets(projectId);

  // Access AI context
  const { 
    geminiApiKey,
    ideogramApiKey,
    clipdropApiKey,
    selectedBrandName,
    selectedMissionStatement,
    selectedVisionStatement,
    selectedValueProposition,
    selectedBrandEssence,
    selectedBrandVoice,
    selectedColorPalette,
    selectedLogo,
    setSelectedLogo,
    resetGeneratedContent
  } = useAI();

  // Check if API keys are set, if not redirect to settings
  useEffect(() => {
    if (!geminiApiKey || (!ideogramApiKey && !clipdropApiKey)) {
      toast.error("API keys are required to use the brand wizard. Please set them in Settings.");
      navigate("/settings");
      return;
    }
  }, [geminiApiKey, ideogramApiKey, clipdropApiKey, navigate, toast]);

  // Load project data when component mounts
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        // Load project info first
        const project = await getProject(projectId);
        if (!project) {
          toast.error("Project not found");
          navigate("/dashboard");
          return;
        }

        setFormData(prev => ({
          ...prev,
          industry: project.industry || "",
          businessName: project.name || ""
        }));

        // For new projects (completion_percentage = 0), set to first step
        if (project.completion_percentage === 0) {
          setCurrentStep("basics");
          setIsLoading(false);
          return;
        }

        // Load step data in parallel to improve performance
        
        const stepsToLoad: StepType[] = ['basics', 'audience', 'personality', 'story', 'competition', 'aesthetics', 'logo', 'results'];
        let accumulatedStepData: Partial<FormData> = {};
        const stepDataPromises = stepsToLoad.map(async (step) => {
          try {
            const stepData = await getStepData(step);
            if (stepData && typeof stepData === 'object' && Object.keys(stepData).length > 0) {
              //Accumulate step data
              if (step === 'logo') {
                // Special handling for logo step
                accumulatedStepData = {
                  ...accumulatedStepData,
                  logo: stepData.logo
                };
              } else {
                accumulatedStepData = {
                  ...accumulatedStepData,
                  ...(stepData as Partial<FormData>),
                };
              }
              
              // Initialize step data cache to avoid unnecessary saves
              setStepDataCache(prev => {
                console.log(`Initializing cache for step: ${step}`);
                // Normalize the data for consistent comparison
                const normalizedData = normalizeDataForComparison(stepData);
                return {
                  ...prev,
                  [step]: normalizedData
                };
              });
              
              setStepsValidity(prev => ({
                ...prev,
                [step]: true
              }));
            }
          } catch (error) {
            // Silent error with toast
            toast.error(`Failed to load ${step} data`);
          }
        });

        // Load assets in parallel
        const assetTypes: AssetType[] = [
          'brand_name', 
          'mission_statement', 
          'vision_statement', 
          'value_proposition', 
          'brand_essence', 
          'brand_voice', 
          'color_palette', 
          'logo',
          'logos', // Add the 'logos' asset (plural) which contains all generated logos
          'moodboard' // Add the 'moodboard' asset
        ];

        const assetPromises = assetTypes.map(async (type) => {
          try {
            const asset = await getAsset(type);
            if (asset) {
              const content = asset.content;
              switch (type) {
                case 'brand_name':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      brandName: content
                    }
                  }));
                  setStepsValidity(prev => ({ ...prev, "ai-name": true }));
                  break;
                case 'mission_statement':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      mission: content
                    }
                  }));
                  break;
                case 'vision_statement':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      vision: content
                    }
                  }));
                  break;
                case 'value_proposition':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      valueProposition: content
                    }
                  }));
                  break;
                case 'brand_essence':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      brandEssence: content
                    }
                  }));
                  break;
                case 'brand_voice':
                  setFormData(prev => ({
                    ...prev,
                    aiGenerated: {
                      ...prev.aiGenerated,
                      brandVoice: content
                    }
                  }));
                  break;
                case 'color_palette':
                  try {
                    const palette = JSON.parse(content) as GeneratedColorPalette;
                    setFormData(prev => ({
                      ...prev,
                      aiGenerated: {
                        ...prev.aiGenerated,
                        colorPalette: palette
                      }
                    }));
                    setStepsValidity(prev => ({ ...prev, "aesthetics": true }));
                  } catch (err) {
                    // Silent error with toast
                    toast.error('Failed to load color palette');
                  }
                  break;
                case 'logos':
                  try {
                    // Verify this logos asset belongs to the current project
                    if (asset.metadata && typeof asset.metadata === 'object' && 'projectId' in asset.metadata) {
                      const assetProjectId = String(asset.metadata.projectId);
                      
                      if (assetProjectId !== projectId) {
                        // Don't load these logos as they belong to a different project
                        break;
                      }
                    }
                    
                    const allLogosContent = JSON.parse(content);
                    
                    if (allLogosContent && allLogosContent.logos && Array.isArray(allLogosContent.logos) && allLogosContent.logos.length > 0) {
                      // Ensure each logo has a unique ID
                      const uniqueLogos = allLogosContent.logos.filter((logo, index, self) => 
                        index === self.findIndex(l => l.id === logo.id)
                      );
                      
                      // Find the selected logo
                      const selectedLogoId = allLogosContent.selectedLogoId;
                      const selectedLogoFromAssets = uniqueLogos.find(logo => logo.id === selectedLogoId) || uniqueLogos[0];
                      
                      // Initialize the generated logos with all saved logos
                      console.log(`BrandWizard: loaded ${uniqueLogos.length} logos from 'logos' asset`);
                      // Force a refresh of the logos
                      setGeneratedLogos([]);
                      // Then set the logos
                      setTimeout(() => {
                        setGeneratedLogos(uniqueLogos);
                      }, 0);
                      
                      // Set the selected logo
                      if (selectedLogoFromAssets) {
                        setSelectedLogo(selectedLogoFromAssets);
                        
                        // Store the selected logo in the form data
                        setFormData(prev => ({
                          ...prev,
                          logo: selectedLogoFromAssets, // Store in main form data
                          aiGenerated: {
                            ...prev.aiGenerated,
                            logo: selectedLogoFromAssets // Also store in aiGenerated
                          }
                        }));
                        setStepsValidity(prev => ({ ...prev, "logo": true }));
                      }
                      
                      // Don't show success toast for logos loading - it's too noisy
                    }
                  } catch (err) {
                    // Don't show error toast for logos loading - it's too intrusive
                    console.error('Failed to load logos:', err);
                  }
                  break;
                  
                case 'logo':
                  try {
                    // Verify this logo belongs to the current project
                    if (asset.metadata && typeof asset.metadata === 'object' && 'projectId' in asset.metadata) {
                      const assetProjectId = String(asset.metadata.projectId);
                      
                      if (assetProjectId !== projectId) {
                        // Don't load this logo as it belongs to a different project
                        break;
                      }
                    }
                    
                    const logo = JSON.parse(content) as GeneratedLogo;
                    // Logo loaded successfully
                    
                    // Only use this logo if we haven't already loaded logos from the 'logos' asset
                    if (generatedLogos.length === 0) {
                      // Store the logo in both the main form data
                      setFormData(prev => ({
                        ...prev,
                        logo: logo, // Store in main form data
                        aiGenerated: {
                          ...prev.aiGenerated,
                          logo: logo // Store in AI generated section
                        }
                      }));
                      
                      // Set the logo step as valid
                      setStepsValidity(prev => ({ ...prev, "logo": true }));
                      
                      // Also update the selected logo in the AI context
                      setSelectedLogo(logo);
                      
                      // Add this logo to the generatedLogos array
                      setGeneratedLogos([logo]);
                    }
                  } catch (err) {
                    // Don't show error toast for logo loading - it's too intrusive
                    console.error('Failed to load logo:', err);
                  }
                  break;
                case 'moodboard':
                  try {
                    // Verify this moodboard belongs to the current project
                    if (asset.metadata && typeof asset.metadata === 'object' && 'projectId' in asset.metadata) {
                      const assetProjectId = String(asset.metadata.projectId);
                      
                      if (assetProjectId !== projectId) {
                        // Don't load this moodboard as it belongs to a different project
                        break;
                      }
                    }
                    
                    const moodboardData = JSON.parse(content);
                    if (moodboardData && Array.isArray(moodboardData.images) && moodboardData.images.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        moodboardUrls: moodboardData.images
                      }));
                      setStepsValidity(prev => ({ ...prev, "aesthetics": true }));
                    }
                  } catch (err) {
                    // Silent error with toast
                    toast.error('Failed to load mood board');
                  }
                  break;
              }
            }
          } catch (error) {
            // Silent error with toast
            toast.error(`Failed to load ${type}`);
          }
        });

        await Promise.all([...stepDataPromises, ...assetPromises]);
        // Apply accumulated step data
        setFormData(prev => ({ ...prev, ...accumulatedStepData }));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading project data:', error);
        toast.error('Failed to load project data');
        navigate("/dashboard");
      }
    };

    loadProjectData();
  }, [projectId, getProject, getStepData, getAsset, navigate, setStepDataCache, normalizeDataForComparison]);

  const updateFormData = useCallback(async (step: string, data: Partial<FormData>, forceSave: boolean = false) => {
    // Check for logo updates
    if (step === 'logo') {
      const hasLogo = !!(data.logo || (data.aiGenerated && data.aiGenerated.logo));
      
      // Explicitly set the logo step as valid if a logo is selected
      if (hasLogo) {
        setStepsValidity(prev => ({
          ...prev,
          'logo': true
        }));
      }
    }
    
    // Update form data in state
    setFormData((prev) => ({
      ...prev,
      ...data
    }));
    
    setStepsValidity(prev => ({
      ...prev,
      [step]: true
    }));
    
    // Optionally immediately save to database (for aesthetic preferences that need to persist)
    if (forceSave && projectId) {
      // First get current form data with the new data applied
      const currentFormData = { ...formData, ...data };
      const { aiGenerated, ...stepData } = currentFormData;
      
      // Normalize data for comparison
      const normalizedCurrentData = normalizeDataForComparison(stepData);
      const cachedData = stepDataCache[step];
      const normalizedCachedData = cachedData ? normalizeDataForComparison(cachedData) : null;
      
      // Stringify for comparison
      const currentDataStr = JSON.stringify(normalizedCurrentData);
      const cachedDataStr = normalizedCachedData ? JSON.stringify(normalizedCachedData) : null;
      
      // Check if data has changed
      const hasChanged = !cachedData || currentDataStr !== cachedDataStr;
      
      console.log(`updateFormData - Step: ${step}, Has cached data: ${!!cachedData}, Has changed: ${hasChanged}`);
      
      // Skip saving if no changes
      if (!hasChanged) {
        console.log('No changes detected in updateFormData, skipping save');
        return;
      }
      
      // If we have changes, save them
      console.log('Changes detected in updateFormData, saving data');
      setIsSaving(true);
      
      try {
        // Save data
        const saveResult = await saveStepData(step as StepType, stepData);
        
        if (saveResult) {
          // Update cache with normalized data
          const normalizedData = normalizeDataForComparison(stepData);
          setStepDataCache(prev => ({
            ...prev,
            [step]: normalizedData
          }));
        } else {
          console.error('Save operation returned false');
          toast.error('Failed to save changes');
        }
      } catch (error) {
        console.error('Error saving step data:', error);
        toast.error('Failed to save changes');
      } finally {
        setIsSaving(false);
      }
    }
  }, [projectId, saveStepData, formData, setStepDataCache, normalizeDataForComparison]);



  // Completely rewritten handleNext function with a simpler approach
  const handleNext = useCallback(async () => {
    if (!projectId) return;
    
    // Move to next step immediately without saving if no changes
    const moveToNextStep = () => {
      const currentIndex = STEPS.indexOf(currentStep);
      if (currentIndex < STEPS.length - 1) {
        setCurrentStep(STEPS[currentIndex + 1]);
      }
    };
    
    // Skip saving for results step
    if (currentStep === 'results') {
      moveToNextStep();
      return;
    }
    
    // Prepare data to save
    const { aiGenerated, ...stepData } = formData;
    let dataToSave = { ...stepData };
    
    // Special handling for logo step
    if (currentStep === 'logo') {
      const logoToSave = formData.logo || formData.aiGenerated?.logo;
      dataToSave = { logo: logoToSave };
    }
    
    // Normalize data for comparison
    const normalizedCurrentData = normalizeDataForComparison(dataToSave);
    const cachedData = stepDataCache[currentStep];
    const normalizedCachedData = cachedData ? normalizeDataForComparison(cachedData) : null;
    
    // Stringify for comparison
    const currentDataStr = JSON.stringify(normalizedCurrentData);
    const cachedDataStr = normalizedCachedData ? JSON.stringify(normalizedCachedData) : null;
    
    // Check if data has changed
    const hasChanged = !cachedData || currentDataStr !== cachedDataStr;
    
    console.log(`Step: ${currentStep}, Has cached data: ${!!cachedData}, Has changed: ${hasChanged}`);
    console.log(`Current data (${currentDataStr.length} chars): ${currentDataStr}`);
    if (cachedData) {
      console.log(`Cached data (${cachedDataStr.length} chars): ${cachedDataStr}`);
      
      // If they're different but similar length, find where they differ
      if (hasChanged && cachedDataStr && Math.abs(currentDataStr.length - cachedDataStr.length) < 50) {
        for (let i = 0; i < Math.min(currentDataStr.length, cachedDataStr.length); i++) {
          if (currentDataStr[i] !== cachedDataStr[i]) {
            console.log(`First difference at position ${i}: '${currentDataStr.substring(i, i+20)}' vs '${cachedDataStr.substring(i, i+20)}'`);
            break;
          }
        }
      }
    }
    
    // If no changes, just move to next step without saving
    if (!hasChanged) {
      console.log('No changes detected, skipping save');
      moveToNextStep();
      return;
    }
    
    // If we have changes, save them
    console.log('Changes detected, saving data');
    setIsSaving(true);
    
    try {
      // Save data
      const saveResult = await saveStepData(currentStep as StepType, dataToSave);
      
      if (saveResult) {
        // Update cache with normalized data
        const normalizedData = normalizeDataForComparison(dataToSave);
        setStepDataCache(prev => ({
          ...prev,
          [currentStep]: normalizedData
        }));
        
        // Move to next step
        moveToNextStep();
      } else {
        // If save failed, don't move to next step
        console.error('Save operation returned false');
        toast.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving step data:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, formData, projectId, saveStepData, stepDataCache, normalizeDataForComparison]);

  const handlePrevious = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleBrandNameSelect = useCallback(async (name: string) => {
    if (!projectId) return;

    try {
      await saveAsset('brand_name', name);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          brandName: name
        }
      }));
      setStepsValidity(prev => ({ ...prev, "ai-name": true }));
      toast.success('Brand name saved successfully');
    } catch (error) {
      console.error('Error saving brand name:', error);
      toast.error('Failed to save brand name');
    }
  }, [projectId, saveAsset]);

  const handleMissionSelect = useCallback(async (statement: string) => {
    if (!projectId) return;

    try {
      await saveAsset('mission_statement', statement);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          mission: statement
        }
      }));
      toast.success('Mission statement saved successfully');
    } catch (error) {
      console.error('Error saving mission statement:', error);
      toast.error('Failed to save mission statement');
    }
  }, [projectId, saveAsset]);

  const handleVisionSelect = useCallback(async (statement: string) => {
    if (!projectId) return;

    try {
      await saveAsset('vision_statement', statement);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          vision: statement
        }
      }));
      toast.success('Vision statement saved successfully');
    } catch (error) {
      console.error('Error saving vision statement:', error);
      toast.error('Failed to save vision statement');
    }
  }, [projectId, saveAsset]);

  const handleValuePropositionSelect = useCallback(async (statement: string) => {
    if (!projectId) return;

    try {
      await saveAsset('value_proposition', statement);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          valueProposition: statement
        }
      }));
      toast.success('Value proposition saved successfully');
    } catch (error) {
      console.error('Error saving value proposition:', error);
      toast.error('Failed to save value proposition');
    }
  }, [projectId, saveAsset]);

  const handleBrandEssenceSelect = useCallback(async (statement: string) => {
    if (!projectId) return;

    try {
      await saveAsset('brand_essence', statement);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          brandEssence: statement
        }
      }));
      toast.success('Brand essence saved successfully');
    } catch (error) {
      console.error('Error saving brand essence:', error);
      toast.error('Failed to save brand essence');
    }
  }, [projectId, saveAsset]);

  const handleBrandVoiceSelect = useCallback(async (statement: string) => {
    if (!projectId) return;

    try {
      await saveAsset('brand_voice', statement);
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          brandVoice: statement
        }
      }));
      toast.success('Brand voice saved successfully');
    } catch (error) {
      console.error('Error saving brand voice:', error);
      toast.error('Failed to save brand voice');
    }
  }, [projectId, saveAsset]);

  const handleColorPaletteSelect = useCallback(async (palette: GeneratedColorPalette) => {
    if (!projectId) return;

    try {
      await saveAsset('color_palette', JSON.stringify(palette));
      setFormData(prev => ({
        ...prev,
        aiGenerated: {
          ...prev.aiGenerated,
          colorPalette: palette
        }
      }));
      setStepsValidity(prev => ({ ...prev, "aesthetics": true }));
      toast.success('Color palette saved successfully');
    } catch (error) {
      console.error('Error saving color palette:', error);
      toast.error('Failed to save color palette');
    }
  }, [projectId, saveAsset]);

  const handleLogoSelect = useCallback(async (logo: GeneratedLogo) => {
    if (!projectId) return;

    try {
      // Add project ID to the metadata for proper filtering
      const metadata = {
        projectId: projectId,
        timestamp: new Date().toISOString()
      };
      
      console.log(`Saving logo for project ${projectId}:`, logo.url);
      await saveAsset('logo', JSON.stringify(logo), metadata);
      
      // Update both the main form data and the AI generated section
      setFormData(prev => ({
        ...prev,
        logo: logo, // Store in main form data
        aiGenerated: {
          ...prev.aiGenerated,
          logo: logo // Store in AI generated section
        }
      }));
      
      // Set the logo step as valid
      setStepsValidity(prev => ({ ...prev, "logo": true }));
      
      toast.success('Logo saved successfully');
    } catch (error) {
      console.error(`Error saving logo for project ${projectId}:`, error);
      toast.error('Failed to save logo');
    }
  }, [projectId, saveAsset]);



  const canProceed = useCallback(() => {
    switch (currentStep) {

      case 'basics':
        return !!formData.industry && !!formData.businessName && !!formData.productService;
      case 'brand-name-generator':
        return !!formData.brandName;
      case 'audience':
        return Object.values(formData.demographics).some(v => v) && 
               Object.values(formData.psychographics).some(v => v.length > 0);
      case 'personality':
        return !!formData.selectedArchetype;
      case 'story': 
        return !!formData.mission && !!formData.vision && formData.values.length > 0;
      case 'competition':
        return formData.competitors.length > 0 && formData.differentiators.length > 0;
      case 'aesthetics':
        return !!formData.visualStyle;
      case 'logo':
        // Allow proceeding if there's a selected logo in either formData.logo or formData.aiGenerated.logo
        const hasLogo = !!formData.logo || !!(formData.aiGenerated && formData.aiGenerated.logo);
        console.log(`canProceed for logo step: ${hasLogo}`, {
          directLogo: !!formData.logo,
          aiGeneratedLogo: !!(formData.aiGenerated && formData.aiGenerated.logo)
        });
        return hasLogo;
      case 'results':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const renderStepContent = useCallback(() => {
    if (isLoading) {

      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-4">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        </div>
      );
      return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    switch (currentStep) {

      case 'basics':
        return (
          <BusinessBasics
            data={formData}
            onChange={(data) => updateFormData('basics', data)}
          />
        );
      case 'brand-name-generator':
        return (
          <BrandNameGeneratorStep
            data={formData}
            onChange={(data) => updateFormData('brand-name-generator', data)}
          />
        );
      case 'audience':
        return (
          <TargetAudience
            data={formData}
            onChange={(data) => updateFormData('audience', data)}
          />
        );
      case 'personality':
        return (
          <BrandPersonality
            data={formData}
            onChange={(data) => updateFormData('personality', data)}
          />
        );
      case 'story':
        return (
          <BrandStory
            data={formData}
            onChange={(data) => updateFormData('story', data)}
          />
        );
      case 'competition':
        return (
          <Competition
            data={formData}
            onChange={(data) => updateFormData('competition', data)}
          />
        );
      case 'aesthetics':
        return (
          <Aesthetics
            data={formData}
            onChange={(data, forceSave = false) => updateFormData('aesthetics', data, forceSave)}
            saveAsset={saveAsset}
            projectId={projectId}
          />
        );
      case 'logo':
        return (
          <LogoGeneration
            data={formData}
            onChange={(data) => updateFormData('logo', data)}
            getAsset={getAsset}
            saveAsset={saveAsset}
            getAllLogos={getAllLogos}
            projectId={projectId}
          />
        );
      case 'results':
        return <Results data={formData} />;
      default:
        return null;
    }
  }, [currentStep, formData, isLoading, updateFormData]);

  // Check if project ID is available
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6 text-center">
            The project you're looking for could not be found. Please return to your projects and try again.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WizardLayout
      currentStep={currentStep}
      onNext={handleNext}
      onPrevious={handlePrevious}
      canProceed={canProceed()}
      isSaving={isSaving}
      header={
          <Button variant={"ghost"} className="flex gap-2" onClick={handlePrevious} disabled={STEPS.indexOf(currentStep) === 0 || isSaving}>
            <ArrowLeft className="h-4 w-4" />
            {STEPS.indexOf(currentStep) === 0 ? 'Start' : 'Back'}
          </Button>

      }
    >
      {renderStepContent()}
    </WizardLayout>
  );
}
