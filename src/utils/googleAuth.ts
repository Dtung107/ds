import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { isAndroidApkEnvironment } from './apiConfig';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
];

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (never localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

/**
 * Initialize auth state listener. Call on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthSignedOutOrNeedsToken?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthSignedOutOrNeedsToken?.(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthSignedOutOrNeedsToken?.(null);
    }
  });
};

/**
 * Sign in with Google via popup and capture Google Drive/Profile OAuth access token in memory.
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (isAndroidApkEnvironment()) {
    throw new Error(
      `Đăng nhập Google trực tiếp chưa hỗ trợ bên trong WebView của bản APK (tên miền "${window.location.hostname || 'localhost'}" chưa được cấp phép và Android WebView chặn cửa sổ OAuth). Hãy mở địa chỉ Cloud/Web của bạn trên trình duyệt Chrome để đăng nhập Google & đồng bộ Drive.`
    );
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được quyền truy cập Google từ cửa sổ đăng nhập.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = String(error?.message || '');
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        `Tên miền "${hostname || 'hiện tại'}" chưa được cấp phép trong Firebase Console (Project ${firebaseConfig.projectId} ➔ Authentication ➔ Settings ➔ Authorized domains). Hãy thêm "${hostname}" vào danh sách tên miền được phép rồi thử lại.`
      );
    }
    if (msg.includes('disallowed_useragent') || code === 'auth/web-storage-unsupported') {
      throw new Error(
        'Trình duyệt tích hợp hiện tại bị Google OAuth chặn đăng nhập (disallowed_useragent). Hãy mở ứng dụng trực tiếp bằng trình duyệt Chrome.'
      );
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Bạn đã đóng cửa sổ đăng nhập Google.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup để đăng nhập Google.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('Nhà cung cấp đăng nhập Google chưa được kích hoạt trong Firebase Authentication.');
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng khi xác thực Google. Vui lòng kiểm tra Internet.');
    }
    throw new Error(msg ? `Lỗi đăng nhập Google (${code || 'auth'}): ${msg}` : 'Không thể đăng nhập bằng Google lúc này.');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearCachedAccessToken = (): void => {
  cachedAccessToken = null;
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};
