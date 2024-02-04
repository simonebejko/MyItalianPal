"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Run, ThreadMessage } from 'openai/resources/beta/threads/index.mjs';
import axios from 'axios';
import { useAtom } from 'jotai';
import { assistantAtom, userThreadAtom } from '@/atom';
import toast from "react-hot-toast";

const POLLING_FREQUENCY_MS = 1000;

function ChatPage() {
    // Atom state
    const [userThread] = useAtom(userThreadAtom);
    const [assistant] = useAtom(assistantAtom);

    // State
    const [fetching, setFetching] = useState(false);
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [pollingRun, setPollingRun] = useState(false);

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
                return;
            }
        
            let newMessages = response.data.messages;
        
            // Sort messages in descending order and filter empty messages
            newMessages = newMessages
                .sort((a, b) => {
                    return (
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
            setMessages([]);
        } finally {
            setFetching(false);
        }
    }, [userThread]); 

    // Continuously check for messages
    useEffect(() => {
        const intervalId = setInterval(fetchMessages, POLLING_FREQUENCY_MS);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    }, [fetchMessages]);

    const startRun = async (
        threadId: string,
        assistantId: string
    ): Promise<string> => {
        // Request to api/run/create
        try {
            const {data: { success, run, error }} = await axios.post<{
                success: boolean;
                error?: string;
                run?: Run;
            }>('api/run/create', {
                threadId,
                assistantId,
            });

            if(!success || !run) {
                console.error(error);
                toast.error("Failed to start run");
                return "";
            }

            return run.id;
        } catch (error){
            console.error(error);
            toast.error("Failed to start run.");
            return "";
        }
    };

    // Continuously check the run
    const pollRunStatus = async (threadId: string, runId: string) => {
        // Request to api/run/retrieve route
        setPollingRun(true);

        const intervalId = setInterval(async () => {
            try {
                const {
                    data: { run, success, error },
                } = await axios.post<{
                    success: boolean;
                    error?: string; 
                    run?: Run;
                }>('api/run/retrieve', {
                    threadId,
                    runId,
                });

                if(!success || !run) {
                    console.error(error);
                    toast.error("Failed to poll run status.");
                    return;
                }

                console.log("run", run);

                if(run.status === "completed") {
                    clearInterval(intervalId);
                    setPollingRun(false);
                    fetchMessages();
                    return;
                } else if (run.status === "failed") {
                    clearInterval(intervalId);
                    setPollingRun(false);
                    toast.error("Run failed.");
                    return;
                }
            } catch (error){
                console.error(error);
                toast.error("Failed to poll run status.");
                clearInterval(intervalId);
            }
        }, POLLING_FREQUENCY_MS);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    };

    const sendMessage = async () => {
        if(!userThread || sending || !assistant) {
            toast.error("Failed to send message. Invalid state.");
            return;
        };

        setSending(true);

        // Send message to /api/message/create route
        try{
            const {
                data: { message: newMessages },
            } = await axios.post<{
                success: boolean;
                message?: ThreadMessage;
                error?: string;
            }>("/api/message/create", {
                message,
                threadId: userThread.threadId,
                fromUser: 'true',
            });
    
            // Update messages with new response
            if(!newMessages) {
                console.error("No message returned.");
                toast.error("Failed to send message. Please try again.");
                return;
            }
            setMessages((prev) => [...prev, newMessages]);
            setMessage("");
            toast.success("Message sent.");

            // Start run and polling
            const runId = await startRun(userThread.threadId, assistant.assistantId);
            if(!runId) {
                toast.error("Failed to start run.");
                return;
            }
            pollRunStatus(userThread.threadId, runId);

        } catch (error) {
            console.error(error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        } 
    };

    return (
        <div className="w-screen h-[calc(100vh-48px)] flex flex-col bg-neutral-100 text-black">
            <div className="flex-grow overflow-y-scroll p-8 space-y-2">
                {/* Feedback when fetching messages */}
                {fetching && messages.length === 0 && (
                    <div className="text-center font-bold">Fetching...</div>
                )}

                {/* Case when there are no messages */}
                {messages.length === 0 && !fetching && (
                    <div className="text-center font-bold">No messages.</div>
                )}
                {/* List out the messages */}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`px-4 py-2 mb-3 rounded-lg w-fit text-md max-w-[600px] ${
                            ["true", "True"].includes(
                                (message.metadata as { fromUser?: string }).fromUser ?? ""
                            )
                                ? "bg-green-600 text-white ml-auto"
                                : "bg-gray-300"
                        }`}     
                    >
                        {message.content[0].type === "text"
                            ? message.content[0].text.value
                                .split("\n")
                                .map((text, index) => <p key={index}>{text}</p>)
                            : null}
                    </div>
                ))}
            </div>

            {/* Input box */}
            <div className="mt-auto p-1 rounded-lg bg-neutral-200 ">
                <div className="flex items-center rounded-sm bg-neutral-100 p-2">
                    <input
                        type="text"
                        className="flex-grow bg-transparent text-black focus:outline-none"
                        placeholder="Enter a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                        disabled={
                            !userThread?.threadId || !assistant || sending || !message.trim()
                        }
                        className="ml-4 bg-green-600 text-white px-4 py-2 rounded-full focus:outline-none disabled:bg-gray-500"
                        onClick={sendMessage}
                    >
                        {sending ? "Sending..." : pollingRun ? "Polling run..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;