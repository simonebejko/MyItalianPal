"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { ThreadMessage } from 'openai/resources/beta/threads/index.mjs';
import axios from 'axios';
import { useAtom } from 'jotai';
import { userThreadAtom } from '@/atom';

const POLLING_FREQUENCY_MS = 1000;

function ChatPage() {
    // Atom state
    const [userThread] = useAtom(userThreadAtom);

    // State
    const [fetching, setFetching] = useState(false);
    const [messages, setMessages] = useState<ThreadMessage[]>([]);

    console.log("userThread", userThread);
    console.log("messages", messages);

    const fetchMessages = useCallback(async () => {
        if (!userThread) return;
            
        setFetching(true);
    
        try {
            const response = await axios.post<{
                success: boolean;
                error?: string;
                messages?: ThreadMessage[];
            }>("/api/message/list", { threadId : userThread.threadId });
        
            if (!response.data.success || !response.data.messages) {
                console.error(response.data.error ?? "Unknown error.");
                setFetching(false);
                return;
            }
        
            let newMessages = response.data.messages;

            console.log("newMessages", newMessages);
        
            // Sort messages in descending order and filter empty messages
            newMessages = newMessages
                .sort((a, b) => {
                    return (
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                })
                .filter(
                    (message) =>
                        message.content[0].type === "text" &&
                        message.content[0].text.value.trim() != ""
                );
        
            setMessages(newMessages);
        } catch (error){
            console.log(error);
            setFetching(false);
            setMessages([]);
        }
    }, [userThread]); 

    // Continuously check for messages
    useEffect(() => {
        const intervalId = setInterval(fetchMessages, POLLING_FREQUENCY_MS);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    }, [fetchMessages]);

    return (
        <div className="w-screen h-screen flex flex-col bg-neutral-200 text-black">
            {/* messages */}
            <div className="flex-grow overflow-y-hidden p-8 space-y-2">
                {/* feedback when fetching messages */}
                {fetching && <div className="text-center font-bold">Fetching...</div>}


                {/* case when there are no messages */}
                {messages.length === 0 && !fetching && (
                    <div className="text-center font-bold">No messages.</div>
                )}
                {/* list out the messages */}
            </div>

            {/* input box */}

        </div>
    );
}

export default ChatPage;