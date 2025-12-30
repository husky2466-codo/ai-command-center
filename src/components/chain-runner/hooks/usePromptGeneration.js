import { loadExistingRAGTopics, generatePrompts, savePromptList, loadPromptList } from '../promptGenerator';

export function usePromptGeneration({
  apiKeys,
  setPromptList,
  setPromptTopic,
  setShowPromptGenerator,
  setIsGeneratingPrompts,
  promptTopic,
  promptCount,
  generatorProvider,
  generatorModel,
  promptList,
  getOllamaUrl,
}) {
  const handleGeneratePrompts = async () => {
    if (!promptTopic.trim()) return;
    setIsGeneratingPrompts(true);

    try {
      const existing = await loadExistingRAGTopics(window.electronAPI);
      console.log(`Loaded ${existing.questions?.length || 0} existing topics for deduplication`);

      const apiKey = generatorProvider === 'ollama'
        ? null
        : generatorProvider === 'anthropic'
        ? apiKeys.ANTHROPIC_API_KEY
        : apiKeys.OPENAI_API_KEY;

      const result = await generatePrompts({
        topic: promptTopic,
        category: 'equipment_guides',
        count: promptCount,
        provider: generatorProvider,
        apiKey,
        model: generatorModel,
        existingTopics: existing.questions || [],
        ollamaUrl: getOllamaUrl()
      });

      if (result.success) {
        setPromptList(result.prompts);
      } else {
        alert(`Failed to generate prompts: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleEditPrompt = (index, newValue) => {
    setPromptList(prev => prev.map((p, i) => i === index ? newValue : p));
  };

  const handleRemovePrompt = (index) => {
    setPromptList(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPrompt = () => {
    setPromptList(prev => [...prev, '']);
  };

  const handleSavePromptList = async () => {
    if (!window.electronAPI || promptList.length === 0) return;
    const result = await savePromptList(promptList, promptTopic, window.electronAPI);
    if (result.success) {
      alert(`Saved: ${result.filename}`);
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  };

  const handleLoadPromptList = async () => {
    if (!window.electronAPI) return;
    const result = await loadPromptList(window.electronAPI);
    if (result.success) {
      setPromptList(result.data.prompts);
      setPromptTopic(result.data.topic || '');
      setShowPromptGenerator(true);
    } else {
      alert(result.error || 'No saved prompt lists found');
    }
  };

  return {
    handleGeneratePrompts,
    handleEditPrompt,
    handleRemovePrompt,
    handleAddPrompt,
    handleSavePromptList,
    handleLoadPromptList,
  };
}
