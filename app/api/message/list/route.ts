import OpenAI from "openai";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
    const { threadId } = await req.json();

    if (!threadId) {
        return NextResponse.json(
            { error: "threadId is required", success: false },
            { status: 400 }
        );
    }

    const openai = new OpenAI();

    try {
        const messages = await openai.beta.threads.messages.list(threadId);

        console.log("from opena messages", messages);
        return NextResponse.json(
            { messages, success: true },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Something went wrong", success: false },
            { status: 500 }
        );
    }
}