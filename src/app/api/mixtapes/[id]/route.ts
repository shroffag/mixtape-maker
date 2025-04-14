import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { options } from "../../auth/[...nextauth]/options";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?.name) {
      return new NextResponse("Unauthorized - No user name found", { status: 401 });
    }

    console.log("Fetching mixtape:", params.id, "for user:", session.user.name);

    const mixtape = await prisma.mixtape.findUnique({
      where: {
        id: params.id,
        createdBy: session.user.name,
      },
      include: {
        songs: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!mixtape) {
      console.error("Mixtape not found:", params.id);
      return new NextResponse("Mixtape not found", { status: 404 });
    }

    console.log("Found mixtape:", mixtape.title);
    return NextResponse.json(mixtape);
  } catch (error) {
    console.error("Error fetching mixtape:", error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
} 