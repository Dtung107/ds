/**
 * Universal Mobile-Ready File Downloader
 * Optimized for Android APK (Capacitor/WebView) and Web Browsers
 */

export async function downloadPythonFile(
  rawFileName: string,
  content: string
): Promise<{ success: boolean; method: 'share' | 'blob' | 'data' | 'clipboard'; message: string }> {
  let fileName = (rawFileName || 'script.py').trim();
  if (!fileName.endsWith('.py')) {
    fileName += '.py';
  }

  // 1. Try Web Share API (Best for Android phones & Capacitor APKs)
  // Allows users to directly "Save to device" (Lưu vào tệp), Google Drive, or any file manager
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Check if File constructor and navigator.canShare with files is supported
      if (typeof File !== 'undefined') {
        const file = new File([content], fileName, {
          type: 'text/plain;charset=utf-8',
          lastModified: Date.now(),
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Mã nguồn Python: ${fileName}`,
          });
          return {
            success: true,
            method: 'share',
            message: `Đã mở bảng lưu/chia sẻ tệp [${fileName}] trên Android!`,
          };
        }
      }
    } catch (shareErr: any) {
      // User cancelled share or device dismissed dialog
      if (shareErr.name === 'AbortError') {
        return {
          success: true,
          method: 'share',
          message: 'Đã hủy thao tác chia sẻ.',
        };
      }
      console.warn('[FileDownload] Web Share API failed, falling back to Blob download:', shareErr);
    }
  }

  // 2. Try Standard Blob URL download (Works on standard browsers)
  try {
    const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);

    return {
      success: true,
      method: 'blob',
      message: `Đã gửi yêu cầu tải về file [${fileName}]!`,
    };
  } catch (blobErr) {
    console.warn('[FileDownload] Blob download failed, trying base64 data URI:', blobErr);
  }

  // 3. Fallback: Base64 Data URI
  try {
    const utf8Bytes = new TextEncoder().encode(content);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:text/x-python;charset=utf-8;base64,${base64}`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 2000);

    return {
      success: true,
      method: 'data',
      message: `Đã tải về [${fileName}] qua liên kết dữ liệu!`,
    };
  } catch (dataErr) {
    console.warn('[FileDownload] Data URI download failed, copying to clipboard:', dataErr);
  }

  // 4. Ultimate Fallback: Copy to Clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      return {
        success: true,
        method: 'clipboard',
        message: `Đã sao chép toàn bộ mã nguồn của [${fileName}] vào bộ nhớ tạm!`,
      };
    }
  } catch (_) {}

  return {
    success: false,
    method: 'clipboard',
    message: `Không thể tải file tự động. Vui lòng sao chép mã nguồn trực tiếp.`,
  };
}
