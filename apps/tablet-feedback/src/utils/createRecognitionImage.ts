const DEFAULT_WIDTH = 2016;
const DEFAULT_HEIGHT = 1344;
const DEFAULT_BACKGROUND = '/images/to-generated-image.png';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = src;
  });

const drawRoundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const clampedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + clampedRadius, y);
  context.lineTo(x + width - clampedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  context.lineTo(x + width, y + height - clampedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - clampedRadius,
    y + height,
  );
  context.lineTo(x + clampedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  context.lineTo(x, y + clampedRadius);
  context.quadraticCurveTo(x, y, x + clampedRadius, y);
  context.closePath();
};

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const sanitized = text.replace(/[\r\n]+/g, '\n').trim();
  const paragraphs = sanitized.length > 0 ? sanitized.split('\n') : [];
  const lines: string[] = [];

  if (paragraphs.length === 0) {
    return ['mensaje de reconocimiento'];
  }

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : ['mensaje de reconocimiento'];
};

const computeCoverSource = (
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
) => {
  const imageAspect = image.width / image.height;
  const targetAspect = targetWidth / targetHeight;

  if (imageAspect > targetAspect) {
    const visibleHeight = image.height;
    const visibleWidth = visibleHeight * targetAspect;
    const offsetX = (image.width - visibleWidth) / 2;
    return { sx: offsetX, sy: 0, sw: visibleWidth, sh: visibleHeight };
  }

  const visibleWidth = image.width;
  const visibleHeight = visibleWidth / targetAspect;
  const offsetY = (image.height - visibleHeight) / 2;
  return { sx: 0, sy: offsetY, sw: visibleWidth, sh: visibleHeight };
};

export type RecognitionImageOptions = {
  message: string;
  photoData: string;
  backgroundUrl?: string;
  width?: number;
  height?: number;
};

export const createRecognitionImage = async ({
  message,
  photoData,
  backgroundUrl = DEFAULT_BACKGROUND,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: RecognitionImageOptions): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available');
  }

  const [backgroundImage, photoImage] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(photoData),
  ]);

  context.drawImage(backgroundImage, 0, 0, width, height);

  const messageBoxWidth = Math.floor(width * 0.68);
  const messageBoxHeight = Math.floor(height * 0.26);
  const messageBoxX = Math.floor((width - messageBoxWidth) / 2);
  const messageBoxY = Math.floor(height * 0.11);
  const messageRadius = Math.floor(width * 0.03);

  drawRoundedRectPath(
    context,
    messageBoxX,
    messageBoxY,
    messageBoxWidth,
    messageBoxHeight,
    messageRadius,
  );
  context.fillStyle = '#FFFFFF';
  context.fill();

  context.font = `600 ${Math.floor(height * 0.06)}px "Montserrat", "Arial", sans-serif`;
  context.fillStyle = '#111111';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const maxTextWidth = messageBoxWidth - Math.floor(width * 0.08);
  const lines = wrapText(context, message.trim(), maxTextWidth);
  const lineHeight = Math.floor(height * 0.08);
  const totalTextHeight = lineHeight * (lines.length - 1);
  const messageCenterY = messageBoxY + messageBoxHeight / 2;

  lines.forEach((line, index) => {
    const lineY = messageCenterY - totalTextHeight / 2 + lineHeight * index;
    context.fillText(line, messageBoxX + messageBoxWidth / 2, lineY);
  });

  const photoBoxWidth = messageBoxWidth;
  const photoBoxHeight = Math.floor(height * 0.46);
  const photoBoxX = messageBoxX;
  const photoBoxY = messageBoxY + messageBoxHeight + Math.floor(height * 0.07);
  const photoRadius = Math.floor(width * 0.04);

  drawRoundedRectPath(
    context,
    photoBoxX,
    photoBoxY,
    photoBoxWidth,
    photoBoxHeight,
    photoRadius,
  );
  context.fillStyle = '#FFFFFF';
  context.fill();

  context.save();
  drawRoundedRectPath(
    context,
    photoBoxX,
    photoBoxY,
    photoBoxWidth,
    photoBoxHeight,
    photoRadius,
  );
  context.clip();

  const coverSource = computeCoverSource(
    photoImage,
    photoBoxWidth,
    photoBoxHeight,
  );

  context.drawImage(
    photoImage,
    coverSource.sx,
    coverSource.sy,
    coverSource.sw,
    coverSource.sh,
    photoBoxX,
    photoBoxY,
    photoBoxWidth,
    photoBoxHeight,
  );
  context.restore();

  return canvas.toDataURL('image/jpeg', 0.9);
};
