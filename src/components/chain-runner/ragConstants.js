// RAG Categories matching target knowledge base (for AV Savant training)
export const RAG_CATEGORIES = [
  { id: 'equipment_guides', label: 'Equipment Guides', description: 'Product specs, setup, usage' },
  { id: 'event_types', label: 'Event Types', description: 'Conferences, concerts, weddings, etc.' },
  { id: 'venue_considerations', label: 'Venue Considerations', description: 'Room acoustics, power, rigging' },
  { id: 'common_mistakes', label: 'Common Mistakes', description: 'Pitfalls and how to avoid them' },
  { id: 'troubleshooting', label: 'Troubleshooting', description: 'Problem diagnosis and fixes' },
];

export const EXPORT_FORMATS = {
  jsonl: {
    id: 'jsonl',
    label: 'JSONL',
    extension: '.jsonl',
    description: 'For vector embedding (one JSON per line)'
  },
  markdown: {
    id: 'markdown',
    label: 'Markdown',
    extension: '.md',
    description: 'Human-readable documentation'
  },
  txt: {
    id: 'txt',
    label: 'Plain Text',
    extension: '.txt',
    description: 'Simple Q&A format'
  },
};

export const SUGGESTED_TAGS = [
  'audio', 'video', 'lighting', 'rigging', 'microphones', 'speakers',
  'projectors', 'screens', 'cameras', 'streaming', 'recording',
  'corporate', 'concert', 'wedding', 'conference', 'theater',
  'wireless', 'networking', 'power', 'cables', 'staging'
];

export const DEFAULT_EXPORT_SETTINGS = {
  category: 'equipment_guides',
  format: 'jsonl',
  tags: [],
  outputPath: null, // Will default to %APPDATA%\ai-command-center\rag-outputs\
};
