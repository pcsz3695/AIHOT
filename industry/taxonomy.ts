// Existing industry contract only; AGENT_TOOLING keeps wire key tip because publication/items.ts checks it.
export const CATEGORIES = [
  { key: "OCR", label: "OCR", section: "OCR", guide: "文字和数学公式识别；Marker、Surya、LaTeX recognition" },
  { key: "DOCUMENT_AI", label: "文档理解", section: "文档理解", guide: "文档布局、reading order、表格、多模态文档模型" },
  { key: "MATH_REPRESENTATION", label: "数学表示", section: "数学表示", guide: "MathDoc、MathML、结构化数学文档和 canonical 表达语义" },
  { key: "GEOMETRY", label: "几何", section: "几何", guide: "几何图重建、TikZ、Asymptote" },
  { key: "PUBLISHING", label: "出版", section: "出版", guide: "LaTeX、TeX Live、Quarto、Pandoc 和数学 PDF 生成" },
  { key: "PDF_QA", label: "PDF 质检", section: "PDF 质检", guide: "PDF QA、veraPDF、PDF standards 和验证；warning 不等于 gate" },
  { key: "tip", label: "智能体工具", section: "智能体工具", guide: "与文档生产有具体关系的 Codex 或 agent tooling" },
  { key: "INFRASTRUCTURE", label: "基础设施", section: "基础设施", guide: "与文档生产实际相关的运行环境、兼容性、资源和接口变更" },
  { key: "RESEARCH", label: "研究", section: "研究", guide: "原始数学文档处理论文、benchmark 和官方项目；证据不越出测量范围" },
] as const;
// Retain the upstream seven output types, with scoped industry meanings in the prompts.
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;
export const CATEGORY_TAGS = ["OCR", "DOCUMENT_AI", "MATH_REPRESENTATION", "GEOMETRY", "PUBLISHING", "PDF_QA", "AGENT_TOOLING", "INFRASTRUCTURE", "RESEARCH"] as const;
export const TOPIC_TAGS = ["marker", "surya", "latex", "texlive", "quarto", "pandoc", "asymptote", "tikz", "verapdf", "mathml", "pdf", "layout", "reading_order", "formula_recognition", "table_extraction", "diagram_reconstruction", "multimodal", "codex", "EXPERIMENT", "OBSERVE", "IGNORE", "NEEDS_EVIDENCE"] as const;
export const ENTITY_TAGS = ["Datalab", "Quarto", "Pandoc", "TeX Live", "Asymptote", "veraPDF", "OpenAI"] as const;
export const TAG_SYNONYMS: Readonly<Record<string, string>> = { Marker: "marker", Surya: "surya", LaTeX: "latex", TikZ: "tikz", MathML: "mathml", Codex: "codex", "值得试验": "EXPERIMENT", "仅观察": "OBSERVE", "可忽略": "IGNORE" };
export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  model_release: "DOCUMENT_AI", product_launch: "INFRASTRUCTURE", tool_or_prompt: "AGENT_TOOLING", research_paper: "RESEARCH", industry_event: "INFRASTRUCTURE", opinion_analysis: "RESEARCH", tutorial_explainer: "PUBLISHING",
};
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  datalab: { name: "Datalab", displayTag: "Datalab", aliases: ["Datalab", "Marker", "Surya"] },
  quarto: { name: "Quarto", displayTag: "Quarto", aliases: ["Quarto", "quarto-cli"] },
  pandoc: { name: "Pandoc", displayTag: "Pandoc", aliases: ["Pandoc"] },
  texlive: { name: "TeX Live", displayTag: "TeX Live", aliases: ["TeX Live", "texlive", "TUG"] },
  asymptote: { name: "Asymptote", displayTag: "Asymptote", aliases: ["Asymptote"] },
  verapdf: { name: "veraPDF", displayTag: "veraPDF", aliases: ["veraPDF"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "Codex"] },
};
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "datalab", name: "Datalab", patterns: [/datalab|\bmarker\b|\bsurya\b/i] },
  { id: "quarto", name: "Quarto", patterns: [/\bquarto\b/i] },
  { id: "pandoc", name: "Pandoc", patterns: [/\bpandoc\b/i] },
  { id: "texlive", name: "TeX Live", patterns: [/tex\s?live|\bTUG\b/i] },
  { id: "asymptote", name: "Asymptote", patterns: [/\basymptote\b/i] },
  { id: "verapdf", name: "veraPDF", patterns: [/\bverapdf\b/i] },
  { id: "openai", name: "OpenAI", patterns: [/\bopenai\b|\bcodex\b/i] },
];
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "datalab", domains: ["datalab.to"] }, { entityId: "quarto", domains: ["quarto.org"] },
  { entityId: "pandoc", domains: ["pandoc.org"] }, { entityId: "texlive", domains: ["tug.org"] },
  { entityId: "asymptote", domains: ["asymptote.sourceforge.io"] }, { entityId: "verapdf", domains: ["verapdf.org"] },
  { entityId: "openai", domains: ["openai.com"] },
];
// Hosting domains such as GitHub must never be treated as the project publisher.
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
