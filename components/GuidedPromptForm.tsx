"use client";

import { useState, useEffect } from "react";

const GRADE_OPTIONS = ["5年级 Grade 5", "6年级 Grade 6", "7年级 Grade 7", "8年级 Grade 8"];

const APP_TYPE_OPTIONS = [
  { zh: "兴趣主页", en: "Hobby Page" },
  { zh: "心情记录", en: "Mood Tracker" },
  { zh: "问答游戏", en: "Quiz Game" },
  { zh: "单词练习", en: "Word Practice" },
  { zh: "阅读记录", en: "Reading Tracker" },
  { zh: "习惯打卡", en: "Habit Tracker" },
  { zh: "翻牌游戏", en: "Memory Match" },
  { zh: "点击游戏", en: "Click Score Game" },
];

const STYLE_OPTIONS = [
  { zh: "明亮活泼", en: "bright and fun" },
  { zh: "安静简洁", en: "calm and clean" },
  { zh: "游戏风", en: "game-style" },
  { zh: "像工具", en: "tool-like" },
];

const COLOR_OPTIONS = [
  { zh: "蓝色", en: "blue" },
  { zh: "橙色", en: "orange" },
  { zh: "绿色", en: "green" },
  { zh: "紫色", en: "purple" },
  { zh: "自定义", en: "colorful" },
];

interface FormFields {
  grade: string;
  appTypeEn: string;
  goal: string;
  features: [string, string, string];
  styleEn: string;
  colorEn: string;
}

function buildPrompt(f: FormFields): string {
  const gradeEn = f.grade.split(" ").slice(1).join(" ");
  const validFeatures = f.features.filter((x) => x.trim());
  const featureList = validFeatures.length > 0 ? validFeatures.join(", ") : "a main interactive feature";
  const goalText = f.goal.trim() || "achieve the main task";
  return `Make a ${f.appTypeEn} for ${gradeEn} students.\nIt should help the user ${goalText}.\nVersion one must include: ${featureList}.\nUse a ${f.styleEn} design with ${f.colorEn} colors.\nKeep text large and clear, suitable for mobile.`;
}

interface GuidedPromptFormProps {
  onChange: (prompt: string) => void;
}

export default function GuidedPromptForm({ onChange }: GuidedPromptFormProps) {
  const [fields, setFields] = useState<FormFields>({
    grade: GRADE_OPTIONS[0],
    appTypeEn: APP_TYPE_OPTIONS[0].en,
    goal: "",
    features: ["", "", ""],
    styleEn: STYLE_OPTIONS[0].en,
    colorEn: COLOR_OPTIONS[0].en,
  });
  const [editable, setEditable] = useState(false);
  const [editText, setEditText] = useState("");

  const composed = buildPrompt(fields);

  // Push prompt to parent whenever it changes
  useEffect(() => {
    // onChange is stable (setPrompt from useState), so this is safe
    onChange(editable ? editText : composed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composed, editable, editText]);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function updateFeature(i: number, val: string) {
    setFields((prev) => {
      const next: [string, string, string] = [...prev.features] as [string, string, string];
      next[i] = val;
      return { ...prev, features: next };
    });
  }

  function handleEditToggle() {
    if (!editable) {
      setEditText(composed);
      setEditable(true);
    } else {
      setEditable(false);
    }
  }

  const labelCls = "text-sm font-medium text-gray-300 mb-1 block";
  const selectCls = "w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600";
  const inputCls = "w-full bg-gray-700 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600";

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: Grade + App type */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[130px]">
          <label className={labelCls}>这是给谁用的 For</label>
          <select
            value={fields.grade}
            onChange={(e) => update("grade", e.target.value)}
            className={selectCls}
          >
            {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex-[2] min-w-[160px]">
          <label className={labelCls}>应用类型 App type</label>
          <select
            value={fields.appTypeEn}
            onChange={(e) => update("appTypeEn", e.target.value)}
            className={selectCls}
          >
            {APP_TYPE_OPTIONS.map((t) => (
              <option key={t.en} value={t.en}>{t.zh} {t.en}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Goal */}
      <div>
        <label className={labelCls}>它要做什么 Goal（一句话）</label>
        <input
          type="text"
          value={fields.goal}
          onChange={(e) => update("goal", e.target.value)}
          placeholder="帮助用户……  e.g. track their daily reading"
          autoFocus
          className={inputCls}
        />
      </div>

      {/* Features */}
      <div>
        <label className={labelCls}>第一版要有哪些功能 Features（最多 3 个）</label>
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2] as const).map((i) => (
            <input
              key={i}
              type="text"
              value={fields.features[i]}
              onChange={(e) => updateFeature(i, e.target.value)}
              placeholder={`功能 ${i + 1}`}
              className={`flex-1 min-w-[110px] bg-gray-700 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600`}
            />
          ))}
        </div>
      </div>

      {/* Style + Color */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[130px]">
          <label className={labelCls}>风格 Style</label>
          <select
            value={fields.styleEn}
            onChange={(e) => update("styleEn", e.target.value)}
            className={selectCls}
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.en} value={s.en}>{s.zh} {s.en}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className={labelCls}>颜色 Color</label>
          <select
            value={fields.colorEn}
            onChange={(e) => update("colorEn", e.target.value)}
            className={selectCls}
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c.en} value={c.en}>{c.zh} {c.en}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompt preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls + " mb-0"}>Prompt 预览 Preview</label>
          <button
            type="button"
            onClick={handleEditToggle}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            {editable ? "🔒 锁定 Lock" : "✏️ 微调 Edit"}
          </button>
        </div>
        {editable ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={5}
            className="w-full bg-gray-700 text-white text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-500"
          />
        ) : (
          <div className="bg-gray-900 text-gray-300 text-xs rounded-lg px-3 py-2.5 whitespace-pre-wrap border border-gray-700 leading-relaxed">
            {composed}
          </div>
        )}
      </div>
    </div>
  );
}
