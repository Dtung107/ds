export interface GoogleDriveFileItem {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export class DriveAuthExpiredError extends Error {
  constructor(message = 'Phiên kết nối Google Drive đã hết hạn. Vui lòng đăng nhập lại bằng Google.') {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

async function handleDriveResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    throw new DriveAuthExpiredError();
  }
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const msg = errJson?.error?.message || `Google Drive phản hồi lỗi HTTP ${res.status}`;
    const reason = errJson?.error?.errors?.[0]?.reason || '';
    if (res.status === 403 && (reason === 'insufficientPermissions' || reason === 'authError')) {
      throw new DriveAuthExpiredError(
        'Tài khoản chưa cấp đủ quyền Google Drive hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.'
      );
    }
    throw new Error(msg);
  }
  return res;
}

/**
 * List Python (.py) / text files managed by this app in Google Drive
 */
export async function listPythonDriveFiles(accessToken: string): Promise<GoogleDriveFileItem[]> {
  const query = encodeURIComponent("trashed = false and mimeType != 'application/vnd.google-apps.folder'");
  const fields = encodeURIComponent('files(id, name, modifiedTime, size, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleDriveResponse(res);
  const data = await res.json();
  return Array.isArray(data?.files) ? data.files : [];
}

/**
 * Download raw text content of a Python file from Google Drive
 */
export async function downloadDriveFileContent(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleDriveResponse(res);
  return await res.text();
}

/**
 * Upload a new Python file OR update an existing file in Google Drive
 */
export async function savePythonFileToDrive(
  accessToken: string,
  options: {
    name: string;
    content: string;
    existingFileId?: string;
  }
): Promise<GoogleDriveFileItem> {
  const { name, content, existingFileId } = options;
  const safeName = name.endsWith('.py') ? name : `${name}.py`;

  const boundary = `pydroid3_drive_boundary_${Date.now()}`;
  const metadata = {
    name: safeName,
    mimeType: 'text/x-python',
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/x-python; charset=UTF-8\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  await handleDriveResponse(res);
  return await res.json();
}

/**
 * Permanently delete a file created with the app on Google Drive
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleDriveResponse(res);
}
