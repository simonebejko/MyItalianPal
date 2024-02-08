import React from 'react';
import { currentUser } from '@clerk/nextjs';
import { prismadb } from '@/lib/prismadb';
import SettingsContainer from '@/components/SettingsContainer';

export default async function SettingsPage() {
    // Current user state
    const user = await currentUser();

    if(!user) {
        throw new Error("No user");
    }

    // Request NotificationPreferences model
    let notificationPreferences = await prismadb.notificationPreferences.findUnique({
        where: {
          userId: user.id,
        },
      });
    
      if (!notificationPreferences) {
        notificationPreferences = await prismadb.notificationPreferences.create({
          data: {
            userId: user.id,
            preferenceId: "ONCE",
          },
        });
      }

    return <div className="max-w-screen-lg m-10 lg:mx-auto">
        <SettingsContainer notificationPreferences={notificationPreferences} />
    </div>
}