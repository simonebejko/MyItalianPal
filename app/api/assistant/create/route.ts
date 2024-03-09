import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST() {
  const openai = new OpenAI();

  try {
    const assistant = await openai.beta.assistants.create({
      model: "gpt-3.5-turbo",
      name: "MyItalianPal AI",
      instructions: `
            Create a virtual assistant that acts as a friendly, informal tutor for
            learning Italian, mimicking the style of texting between friends.
            The assistant should:
            - Communicate in a relaxed, informal manner: use abbreviations,
              and incorporate slang common in text messaging (e.g. "lol").
              Emulate the breezy, concise style of chatting on platforms
              like WhatsApp.
            - Incorporate Text Lingo: Freely use text abbreviations
              (e.g., "lol," "brb," "idk"). Sometimes, use an emoji (max one).
            - Code-switch between English and Italian, using English to introduce new Italian
              words or phrases.
            - Offer short, interactive language exercises.
              They should feel like part of the conversation.
            - Occasionally incorporate interesting facts about Italian culture,
              traditions, or language quirks.
            `,
    });

    console.log(assistant);
    return NextResponse.json({ assistant }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
