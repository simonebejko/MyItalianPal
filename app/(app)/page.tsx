"use client";

import React, { useState } from 'react';
import { ThreadMessage } from 'openai/resources/beta/threads/index.mjs';

function ChatPage() {
    const [fetching, setFetching] = useState(false);
    const [messages, setMessages] = useState<ThreadMessage[]>([]);

    const fetchMessages = async () => {
    }

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