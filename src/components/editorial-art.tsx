import Image from "next/image";

type EditorialArtProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  showDevelopmentLabel?: boolean;
};

export function EditorialArt({
  src,
  alt,
  className = "",
  priority = false,
  showDevelopmentLabel = false,
}: EditorialArtProps) {
  return (
    <div className={`editorial-art ${className}`}>
      <Image
        alt={alt}
        className="art-image"
        fill
        preload={priority}
        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 70vw, 55vw"
        src={src}
      />
      {showDevelopmentLabel && <span className="art-label">DEVELOPMENT ARTWORK</span>}
    </div>
  );
}
