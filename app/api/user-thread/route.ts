import { prismadb } from "@/lib/prismadb";
import { currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
    const user = await currentUser();

    if (!user) {
        return NextResponse.json(
            { success: false, message: "unauthorized" },
            { status: 401 }
        );
    }

    // Get user thread from database
    const userThread = await prismadb.userThread.findUnique({
        where: { userId: user.id },
    });

    // Return userThread if the user has one
    if (userThread) {
        return NextResponse.json(
            { userThread, success: true },
            { status: 200 }
        );
    }

    // Create userThread if the user does not have one
    try {
        const openai = new OpenAI();
        const thread = await openai.beta.threads.create();

        // Save it to the database
        const newUserThread = await prismadb.userThread.create({
            data: {
                userId: user.id,
                threadId: thread.id,
            },
        });

        // Return the userThread to the frontend
        return NextResponse.json(
            { userThread: newUserThread, success: true },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "error creating thread" },
            { status: 500 }
        );
    }
}