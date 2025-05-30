
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAI } from '@/contexts/AIContext';

type GenerationType = 'mission' | 'vision' | 'values' | 'originStory';

interface GenerationData {
  industry: string;
  name: string;
  productService: string;
}

export const useAIGeneration = () => {
  const { geminiApiKey } = useAI();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (type: GenerationType, data: GenerationData) => {
    setIsGenerating(true);
    setError(null);

    if (!geminiApiKey) {
      setError("Gemini API key is required");
      setIsGenerating(false);
      return null;
    }

    try {
      const { data: generatedData, error: functionError } = await supabase.functions.invoke(
        'generate-branding',
        {
          body: { type, data, apiKey: geminiApiKey },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      return generatedData.content;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate content';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    error,
  };
};
