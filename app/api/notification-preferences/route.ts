import { currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prismadb";

export async function POST(request: Request) {
    const user = await currentUser();

    if(!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {id, sendNotifications, preferenceId } = await request.json();

    if (!id || sendNotifications === undefined || !preferenceId) {
        return NextResponse.json(
            { message: "Missing required fields" },
            { status: 400 }
        );
    }

    try {
        const updatedNotificationPreferences =
            await prismadb.notificationPreferences.update({
                where: {
                    id: id,
                    userId: user.id,
                },
                data: {
                    preferenceId,
                    sendNotifications,
                },
        });

        return NextResponse.json({
            success: true,
            data: updatedNotificationPreferences,
        });
    } catch (error){
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Something went wrong"},
            { status: 500 }
        );
    }
}