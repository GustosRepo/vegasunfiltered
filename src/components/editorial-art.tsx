import Image from "next/image";

type EditorialArtProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function EditorialArt({
  src,
  alt,
  className = "",
  priority = false,
}: EditorialArtProps) {
  return (
    <div className={`editorial-art ${className}`}>
      <Image
        alt={alt}
        className="art-image"
        fill
        priority={priority}
        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 70vw, 55vw"
        src={src}
      />
      <span className="art-label">DEVELOPMENT ARTWORK</span>
    </div>
  );
}
