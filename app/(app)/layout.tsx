"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Assistant, UserThread } from "@prisma/client";
import Navbar from "@/components/Navbar";
import { useAtom } from "jotai";
import { assistantAtom, userThreadAtom } from "@/atom";
import toast, { Toaster } from "react-hot-toast";
import useServiceWorker from "@/hooks/useServiceWorker";
import NotificationModal from "@/components/NotificationModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Atom State
  const [, setUserThread] = useAtom(userThreadAtom);
  const [assistant, setAssistant] = useAtom(assistantAtom);

  // State
  const [isNotificationModalVisible, setIsNotificationModalVisible] =
    useState(false);

  // Hooks
  useServiceWorker();

  // Fetch the assistant id
  useEffect(() => {
    if (assistant) return;

    async function getAssistant() {
      try {
        const response = await axios.get<{
          success: boolean;
          message?: string;
          assistant: Assistant;
        }>("/api/assistant");

        if (!response.data.success || !response.data.assistant) {
          console.error(response.data.message ?? "Unknown error.");
          toast.error("Failed to fetch assistant.");
          setAssistant(null);
          return;
        }

        setAssistant(response.data.assistant);
      } catch (error) {
        console.error(error);
        setAssistant(null);
      }
    }

    getAssistant();
  }, [assistant, setAssistant]);

  // Fetch the user's thread
  useEffect(() => {
    async function getUserThread() {
      try {
        const response = await axios.get<{
          success: boolean;
          message?: string;
          userThread: UserThread;
        }>("/api/user-thread");

        if (!response.data.success || !response.data.userThread) {
          console.error(response.data.message ?? "Unknown error.");
          setUserThread(null);
          return;
        }

        setUserThread(response.data.userThread);
      } catch (error) {
        console.error(error);
        setUserThread(null);
      }
    }

    getUserThread();
  }, [setUserThread]);

  useEffect(() => {
    if ("Notification" in window) {
      setIsNotificationModalVisible(Notification.permission === "default");
      console.log("Notificaton permission:", Notification.permission);
    }
  }, []);

  const saveSubscription = useCallback(async () => {
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    try {
      const response = await axios.post("/api/subscription", subscription);

      if (!response.data.success) {
        console.error(response.data.message ?? "Unknown error.");
        toast.error("Failed to save subscription.");
        return;
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save subscription.");
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      if (Notification.permission === "granted") {
        saveSubscription();
      }
    }
  }, [saveSubscription]);

  const handleNotificationModalClose = (didConsent: boolean) => {
    setIsNotificationModalVisible(false);

    if (didConsent) {
      toast.success("You will now receive notifications from MyItalianPal.");
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <Navbar />
      {children}
      {isNotificationModalVisible && (
        <NotificationModal
          onRequestClose={handleNotificationModalClose}
          saveSubscription={saveSubscription}
        />
      )}
      <Toaster />
    </div>
  );
}
