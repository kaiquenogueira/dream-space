
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

export const downloadAllImages = async (images: UploadedImage[]): Promise<void> => {
  const generatedImages = images.filter(img => img.generatedUrl || img.videoUrl);
  if (generatedImages.length === 0) return;

  try {
    const zip = new JSZip();
    const folder = zip.folder("dreamspace-designs");

    if (!folder) throw new Error("Could not create zip folder");

    for (const [index, img] of generatedImages.entries()) {
      if (img.generatedUrl) {
        const url = img.generatedUrl;
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
          const blob = new Blob([u8arr], { type: mime });
          const extension = mime.split('/')[1] || 'png';
          folder.file(`design-${index + 1}.${extension}`, blob);
        } else {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          const blob = await response.blob();
          const extension = blob.type?.split('/')[1] || 'png';
          folder.file(`design-${index + 1}.${extension}`, blob);
        }
      }

      if (img.videoUrl) {
         try {
            // Fetch video content
            const videoBlob = await fetch(img.videoUrl).then(r => {
                if (!r.ok) throw new Error(`Failed to fetch video: ${r.statusText}`);
                return r.blob();
            });
            folder.file(`tour-${index + 1}.mp4`, videoBlob);
         } catch (videoErr) {
             console.error(`Failed to include video for image ${index + 1}:`, videoErr);
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
