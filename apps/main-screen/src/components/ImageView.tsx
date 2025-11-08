interface ImageViewProps {
  src: string;
  alt?: string;
  className?: string;
}

export const ImageView = ({
  src,
  alt = "View",
  className = "",
}: ImageViewProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <div
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};
