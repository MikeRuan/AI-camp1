import Image from "next/image";

interface ZyntriLogoProps {
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { img: 28, text: "text-sm" },
  md: { img: 36, text: "text-base" },
  lg: { img: 48, text: "text-xl" },
};

export default function ZyntriLogo({ size = "md" }: ZyntriLogoProps) {
  const { img, text } = SIZES[size];
  return (
    <div className="flex items-center gap-2 select-none">
      <Image
        src="/logo.png"
        alt="Zyntri logo"
        width={img}
        height={img}
        className="rounded-lg object-contain"
        priority
      />
      <span className={`font-bold text-gray-800 tracking-tight ${text}`}>Zyntri</span>
    </div>
  );
}
