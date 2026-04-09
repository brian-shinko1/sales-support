"use client";

import { useState, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function useGoogleAuth() {
  const [token, setToken] = useState<string | null>(null);

  const requestToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (token) { resolve(token); return; }
      if (!window.google) { reject(new Error("Google GSI not loaded")); return; }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (res) => {
          if (res.error || !res.access_token) {
            reject(new Error(res.error ?? "No token"));
          } else {
            setToken(res.access_token);
            resolve(res.access_token);
          }
        },
      });
      client.requestAccessToken();
    });
  }, [token]);

  return { token, requestToken };
}
