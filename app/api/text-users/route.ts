import { UserThread } from "@prisma/client";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios from "axios";
import { prismadb } from "@/lib/prismadb";


interface UserThreadMap {
    [userId: string]: UserThread;
}

export async function POST(request: Request) {
    const body = await request.json();

    const { preferenceId, secret } = body;
    if (!preferenceId || !secret) {
        return NextResponse.json(
            { success: false, message: "Missing required fields" },
            {
                status: 400,
            }
        );
    }
    
    if (secret !== process.env.APP_SECRET_KEY) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            {
                status: 401,
            }
        );
    }
    
    // Define text message prompt
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `
            You're a friendly, informal Italian language tutor.
            You MUST mimick the style of texting between friends.
            You MUST communicate in a relaxed, informal manner:
            text should often be uncapitalized, use abbreviations
            (e.g. "lol"), use slang and emojis common in text messaging.
            You MUST blend English and Italian (code-switching).
            `,
        },
        {
            role: "user",
            content: `
            Generate a short Italian lesson and/or exercise message for the user.
            It can include vocabulary, grammar explanations, phrases,
            or exercises. You must:
            - Avoid very basic topics (e.g. teaching how to say "Good Morning" or "Hello").
            - Speak as if you are texting (abbreviations such as "lol", emojis, etc),
              but do NOT use too many emojis (one or two is fine).
            - Code-switch between English and Italian, but use more English than Italian.
            - The message MUST follow the instructions provided beforehand.
            `,
        },
    ];
    
    // Generate text
    const {
        data: { message, success },
    } = await axios.post<{ message?: string; success: boolean }>(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/openai`,
        {
            messages,
            secret: process.env.APP_SECRET_KEY,
        }
    );

    if (!message || !success) {
        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong when generating OpenAI response",
            },
            {
                status: 500,  
            }
        );
    }

    console.log(message);

    // Fetch the notification preferences
    const notificationPreferences = await prismadb.notificationPreferences.findMany({
        where: {
            preferenceId,
        },
    });

    console.log("notificationPreferences", notificationPreferences);

    const userIds = notificationPreferences.map((np) => np.userId);

    console.log("userIds", userIds);

    // Fetch all user threads
    const userThreads = await prismadb.userThread.findMany({
        where: {
            userId: {
                in: userIds,
            },
        },
    });

    console.log("userThreads", userThreads);

    const userThreadMap: UserThreadMap  = userThreads.reduce((map, thread) => {
        map[thread.userId] = thread;
        return map;
    }, {} as UserThreadMap);

    // Add messages to threads
    const threadPromises: Promise<any>[] = [];

    try {
        notificationPreferences.forEach((np) => {
            // Find the respective user
            const userThread = userThreadMap[np.userId];
    
            // Add message to thread
            if(userThread) {
                threadPromises.push(
                    axios.post(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/api/message/create`,
                        {
                            message,
                            threadId: userThread.threadId,
                            fromUser: "false",
                        }
                    )
                );
            }
        });
    
        await Promise.all(threadPromises);
    
        return NextResponse.json({ message }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Something went wrong" },
            { status: 500}
        );
    }

}

// TODO (FUTURE): Send PWA notification to user