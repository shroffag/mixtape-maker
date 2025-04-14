import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { options } from "../auth/[...nextauth]/options";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?.name) {
      return new NextResponse("Unauthorized - No user name found", { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title?.trim()) {
      return new NextResponse("Title is required", { status: 400 });
    }

    console.log("Creating mixtape:", { title, description, createdBy: session.user.name });

    const mixtape = await prisma.mixtape.create({
      data: {
        title,
        description,
        createdBy: session.user.name,
        shareId: nanoid(10),
      },
    });

    console.log("Mixtape created:", mixtape);
    return NextResponse.json(mixtape);
  } catch (error) {
    console.error("Error creating mixtape:", error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
} 