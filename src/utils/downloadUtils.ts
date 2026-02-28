import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Property, UploadedImage } from '../types';
import { DOWNLOAD_CONSTANTS } from '../constants';

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const downloadComparison = async (
  originalUrl: string,
  generatedUrl: string,
  activeProperty: Property | null
): Promise<void> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  try {
    const [img1, img2] = await Promise.all([loadImage(originalUrl), loadImage(generatedUrl)]);

    const width = img1.width + img2.width;
    const height = Math.max(img1.height, img2.height);
    const footerHeight = DOWNLOAD_CONSTANTS.FOOTER_HEIGHT;

    canvas.width = width;
    canvas.height = height + footerHeight;

    // Background
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw images
    ctx.drawImage(img1, 0, 0);
    ctx.drawImage(img2, img1.width, 0);

    // Labels
    const labelW = DOWNLOAD_CONSTANTS.LABEL_WIDTH;
    const labelH = DOWNLOAD_CONSTANTS.LABEL_HEIGHT;

    // "ANTES" Label
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_OVERLAY;
    ctx.fillRect(20, 20, labelW, labelH);
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_TEXT;
    ctx.font = DOWNLOAD_CONSTANTS.FONT_LABEL;
    ctx.fillText("ANTES", 40, 48);

    // "DEPOIS" Label
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_OVERLAY;
    ctx.fillRect(img1.width + 20, 20, labelW, labelH);
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_TEXT;
    ctx.fillText("DEPOIS", img1.width + 40, 48);

    // Footer
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_FOOTER_BG;
    ctx.fillRect(0, height, width, footerHeight);

    // Property Name
    ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_TEXT;
    ctx.font = DOWNLOAD_CONSTANTS.FONT_TITLE;
    const propName = activeProperty?.name || "Etherea Design";
    ctx.fillText(propName, 30, height + 50);

    // Logo or Credit
    if (activeProperty?.logo) {
      const logo = await loadImage(activeProperty.logo);
      const maxLogoH = footerHeight - 20;
      const scale = maxLogoH / logo.height;
      const logoW = logo.width * scale;
      const logoH = logo.height * scale;

      ctx.drawImage(logo, width - logoW - 30, height + 10, logoW, logoH);
    } else {
      ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_CREDIT_TEXT;
      ctx.font = DOWNLOAD_CONSTANTS.FONT_CREDIT;
      ctx.textAlign = "right";
      ctx.fillText("Gerado com Etherea AI", width - 30, height + 45);
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = `comparison-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Failed to generate comparison", err);
    throw new Error("Falha ao gerar a imagem de comparação.");
  }
};

export const downloadSingle = (url: string, name: string, extension: string = 'png'): void => {
  const link = document.createElement('a');
  link.download = `${name}-${Date.now()}.${extension}`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Generates a before/after comparison canvas and returns it as a Blob. */
const generateComparisonBlob = async (
  originalUrl: string,
  generatedUrl: string
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const [img1, img2] = await Promise.all([loadImage(originalUrl), loadImage(generatedUrl)]);

  const width = img1.width + img2.width;
  const height = Math.max(img1.height, img2.height);
  const footerHeight = DOWNLOAD_CONSTANTS.FOOTER_HEIGHT;

  canvas.width = width;
  canvas.height = height + footerHeight;

  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img1, 0, 0);
  ctx.drawImage(img2, img1.width, 0);

  const labelW = DOWNLOAD_CONSTANTS.LABEL_WIDTH;
  const labelH = DOWNLOAD_CONSTANTS.LABEL_HEIGHT;

  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_OVERLAY;
  ctx.fillRect(20, 20, labelW, labelH);
  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_TEXT;
  ctx.font = DOWNLOAD_CONSTANTS.FONT_LABEL;
  ctx.fillText("ANTES", 40, 48);

  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_OVERLAY;
  ctx.fillRect(img1.width + 20, 20, labelW, labelH);
  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_TEXT;
  ctx.fillText("DEPOIS", img1.width + 40, 48);

  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_FOOTER_BG;
  ctx.fillRect(0, height, width, footerHeight);

  ctx.fillStyle = DOWNLOAD_CONSTANTS.COLOR_CREDIT_TEXT;
  ctx.font = DOWNLOAD_CONSTANTS.FONT_CREDIT;
  ctx.textAlign = "right";
  ctx.fillText("Gerado com Etherea AI", width - 30, height + 45);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create comparison blob'));
    }, 'image/png');
  });
};

/** Fetches a URL/data-URI and returns a Blob. */
const fetchAsBlob = async (url: string): Promise<{ blob: Blob; extension: string }> => {
  if (url.startsWith('data:')) {
    const arr = url.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const extension = mime.split('/')[1] || 'png';
    return { blob: new Blob([u8arr], { type: mime }), extension };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  const blob = await response.blob();
  const extension = blob.type?.split('/')[1] || 'png';
  return { blob, extension };
};

export const downloadAllImages = async (images: UploadedImage[]): Promise<void> => {
  const imagesWithContent = images.filter(img => img.previewUrl || img.generatedUrl || img.videoUrl);
  if (imagesWithContent.length === 0) return;

  try {
    const zip = new JSZip();
    const originalsFolder = zip.folder("originais");
    const designsFolder = zip.folder("designs");
    const comparisonsFolder = zip.folder("antes-e-depois");

    if (!originalsFolder || !designsFolder || !comparisonsFolder) {
      throw new Error("Could not create zip folders");
    }

    for (const [index, img] of imagesWithContent.entries()) {
      const num = index + 1;

      // 1. Original image
      if (img.previewUrl) {
        try {
          const { blob, extension } = await fetchAsBlob(img.previewUrl);
          originalsFolder.file(`original-${num}.${extension}`, blob);
        } catch (err) {
          console.warn(`Failed to include original for image ${num}:`, err);
        }
      }

      // 2. Generated design
      if (img.generatedUrl) {
        try {
          const { blob, extension } = await fetchAsBlob(img.generatedUrl);
          designsFolder.file(`design-${num}.${extension}`, blob);
        } catch (err) {
          console.warn(`Failed to include design for image ${num}:`, err);
        }
      }

      // 3. Before & After comparison
      if (img.previewUrl && img.generatedUrl) {
        try {
          const comparisonBlob = await generateComparisonBlob(img.previewUrl, img.generatedUrl);
          comparisonsFolder.file(`comparacao-${num}.png`, comparisonBlob);
        } catch (err) {
          console.warn(`Failed to include comparison for image ${num}:`, err);
        }
      }

      // 4. Video (if available)
      if (img.videoUrl) {
        try {
          const videoBlob = await fetch(img.videoUrl).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch video: ${r.statusText}`);
            return r.blob();
          });
          designsFolder.file(`tour-${num}.mp4`, videoBlob);
        } catch (videoErr) {
          console.warn(`Failed to include video for image ${num}:`, videoErr);
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "dreamspace-designs.zip");
  } catch (err) {
    console.error("Failed to generate ZIP", err);
    throw new Error("Falha ao criar o arquivo ZIP.");
  }
};
