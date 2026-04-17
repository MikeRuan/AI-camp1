"use client";

interface Template {
  id: string;
  icon: string;
  labelZh: string;
  labelEn: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: "hobby",
    icon: "⭐",
    labelZh: "兴趣主页",
    labelEn: "Hobby Page",
    prompt: `Make a fun single-page website for a grade 5 student to introduce their hobby. Include a big title, a short self-introduction, three favorite things about the hobby, and a section called "Why I Like It." Use bright colors, large text, and simple icons. The page should be easy to read and feel friendly.`,
  },
  {
    id: "mood",
    icon: "😊",
    labelZh: "心情记录页",
    labelEn: "Mood Tracker",
    prompt: `Make a simple mood tracker page for elementary students. Show four mood buttons: happy, tired, excited, and worried. When a student clicks one mood, display a friendly message and change the color of the page to match that feeling. Use large buttons, clear labels, and a calm, welcoming design.`,
  },
  {
    id: "quiz",
    icon: "❓",
    labelZh: "三题问答游戏",
    labelEn: "Quiz Game",
    prompt: `Make a simple quiz game for students in grades 5–8. The game should have a start button, three multiple-choice questions, one question shown at a time, instant feedback after each answer, and a final score screen at the end. Use large buttons, friendly colors, and clear text. The topic can be animals, space, sports, or books.`,
  },
  {
    id: "word",
    icon: "📝",
    labelZh: "单词练习器",
    labelEn: "Word Practice",
    prompt: `Make a simple word practice page with one word shown at a time, a check button, and encouraging feedback after each answer. The topic is animal vocabulary. Use large text, clear buttons, and a friendly design suitable for classroom use.`,
  },
  {
    id: "reading",
    icon: "📚",
    labelZh: "阅读记录器",
    labelEn: "Reading Tracker",
    prompt: `Make a single-page reading log where students can enter a book title, the number of pages read, and one feeling or idea about the book. After clicking Add, show the entry in a list below. Keep the design simple, clean, and easy to use on a phone.`,
  },
  {
    id: "habit",
    icon: "✅",
    labelZh: "习惯打卡",
    labelEn: "Habit Tracker",
    prompt: `Make a habit tracker with 3 daily goals, a clickable check mark for each, and a progress message that updates as goals are completed. Use clear labels, large tap targets, and a simple, motivating design.`,
  },
  {
    id: "memory",
    icon: "🃏",
    labelZh: "翻牌配对",
    labelEn: "Memory Match",
    prompt: `Make a memory match game with 8 cards arranged in a grid. Cards are face down at the start. When a student clicks two cards, flip them over — if they match, keep them open; if not, flip them back. Show a congratulations message when all pairs are found. Include a restart button.`,
  },
  {
    id: "click",
    icon: "🎯",
    labelZh: "点击得分游戏",
    labelEn: "Click Score Game",
    prompt: `Make a simple clicking game with a single target that appears on screen. Each time the student clicks the target, the score goes up by one. Show a win message when the score reaches 20. Include a restart button. Use bright colors and large text.`,
  },
];

interface PromptTemplatesProps {
  currentPrompt: string;
  onSelect: (prompt: string) => void;
}

export default function PromptTemplates({ currentPrompt, onSelect }: PromptTemplatesProps) {
  function handleClick(template: Template) {
    if (currentPrompt.trim() && currentPrompt !== template.prompt) {
      if (!confirm("Replace the current prompt with this template?")) return;
    }
    onSelect(template.prompt);
  }

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-400 mb-2">Quick templates — click to fill / 点击模板快速填入:</p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleClick(t)}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-xs px-3 py-2 rounded-lg transition border border-gray-600 hover:border-gray-400"
          >
            <span className="text-base">{t.icon}</span>
            <span className="font-medium">{t.labelZh}</span>
            <span className="text-gray-400 hidden sm:inline">{t.labelEn}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
