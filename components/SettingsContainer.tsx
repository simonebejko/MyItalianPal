"use client";

import React, { useState } from 'react';
import { NotificationPreferences } from '@prisma/client';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import FrequencyCard from './FrequencyCard';
import axios from 'axios';
import toast from 'react-hot-toast';

const notificationFrequencies = [
    {
        id: "ONCE",
        frequency: "Once a day",
        description: "Receive 1 notification per day (7AM EST)."
    },
    {
        id: "TWICE",
        frequency: "Twice a day",
        description: "Receive 2 notifications per day (7AM & 12PM EST)."
    },
    {
        id: "THRICE",
        frequency: "Thrice a day",
        description: "Receive 3 notifications per day (7AM, 12PM, & 5PM EST)."
    },
];

type Frequencies = "ONCE" | "TWICE" | "THRICE";

interface SettingsContainerProps {
    notificationPreferences: NotificationPreferences;
}

function SettingsContainer({ notificationPreferences }: SettingsContainerProps) {
    const [saving, setSaving] = useState(false);

    const [selectedFrequency, setSelectedFrequency] = useState(
        notificationPreferences.preferenceId
    );   
    const [sendNotifications, setSendNotifications] = useState(
        notificationPreferences.sendNotifications
    );

    const handleToggleNotifications = () => {
        setSendNotifications((prev) => !prev);
    };

    const handleSelectedFrequency = (frequencyId: Frequencies) => {
        setSelectedFrequency(frequencyId);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await axios.post<{
                success: boolean;
                data?: NotificationPreferences;
                message?: String;
            }>("/api/notification-preferences", {
                id: notificationPreferences.id,
                preferenceId: selectedFrequency,
                sendNotifications,
            });

            if(!response.data.success || !response.data.data) {
                console.error(response.data.message ?? "Something went wrong.");
                //toast.error(response.data.message ?? "Something went wrong.");
                toast.error("Something went wrong.");
                return;
            }

            toast.success("Preferences saved.");
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center mb-4">
                <h1 className="font-bold text-2xl">Notifications</h1>
                <Button onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
            {/* Push notifications card */}
            <div className="flex flex-row items-center justify-between mb-4 p-4 shadow rounded-lg">
                <div>
                    <h3 className="font-medium text-gray-900">Push Notifications</h3>
                    <p>Receive push notifications periodically.</p>
                </div>
                <Switch
                    checked={sendNotifications}
                    onCheckedChange={handleToggleNotifications}
                />
            </div>
            {/* Map through difficulties (grid) */}
            <div className="grid grid-col-1 md:grid-cols-3 gap-4">
                {notificationFrequencies.map((frequency) => (
                    <FrequencyCard
                        key={frequency.id}
                        frequency={frequency.frequency}
                        description={frequency.description}
                        selected={frequency.id === selectedFrequency}
                        onSelect={() =>
                            handleSelectedFrequency(frequency.id as Frequencies)
                        }
                    />
                ))}
            </div>
        </div>
    );
}

export default SettingsContainer;