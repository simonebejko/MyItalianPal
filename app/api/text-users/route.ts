import { UserMeta, UserThread } from "@prisma/client";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios from "axios";
import { prismadb } from "@/lib/prismadb";

interface UserThreadMap {
  [userId: string]: UserThread;
}

interface UserMetaMap {
  [userId: string]: UserMeta;
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
        Provide an Italian language learning lesson
        and a corresponding exercise for daily practice,
        as a friendly, informal Italian language tutor.
        Mimick the style of texting between friends.
        (relaxed, informal manner, text slang/abbreviations).
        Mix English and Italian.
            `,
    },
    {
      role: "user",
      content: `
            Generate a short Italian lesson and/or exercise message for the user.
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
  const notificationPreferences =
    await prismadb.notificationPreferences.findMany({
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

  // Fetch all user metadata
  const userMetas = await prismadb.userMeta.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  console.log("userMeta", userMetas);

  const userThreadMap: UserThreadMap = userThreads.reduce((map, thread) => {
    map[thread.userId] = thread;
    return map;
  }, {} as UserThreadMap);

  const userMetaMap = userMetas.reduce((map, meta) => {
    map[meta.userId] = meta;
    return map;
  }, {} as UserMetaMap);

  // Add messages to threads
  const threadAndNotificationPromises: Promise<any>[] = [];

  try {
    notificationPreferences.forEach((np) => {
      // Find the respective user
      const userThread = userThreadMap[np.userId];

      // Add message to thread
      if (userThread) {
        // Send message
        threadAndNotificationPromises.push(
          axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/message/create`, {
            message,
            threadId: userThread.threadId,
            fromUser: "false",
          })
        );

        // Send notification
        if (np.sendNotifications) {
          const correspondingUserMeta = userMetaMap[np.userId];
          threadAndNotificationPromises.push(
            axios.post(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/send-notification`,
              {
                subscription: {
                  endpoint: correspondingUserMeta.endpoint,
                  keys: {
                    auth: correspondingUserMeta.auth,
                    p256dh: correspondingUserMeta.p256dh,
                  },
                },
                message,
              }
            )
          );
        }
      }
    });

    await Promise.all(threadAndNotificationPromises);

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
