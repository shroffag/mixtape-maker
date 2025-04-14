import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    console.log("Fetching mixtape with shareId:", params.shareId);
    
    const mixtape = await prisma.mixtape.findUnique({
      where: {
        shareId: params.shareId,
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
      console.log("Mixtape not found:", params.shareId);
      return NextResponse.json(
        { message: "Mixtape not found" },
        { status: 404 }
      );
    }

    console.log("Mixtape found:", mixtape.id);
    
    return NextResponse.json(mixtape);
  } catch (error) {
    console.error("Error fetching shared mixtape:", error);
    return NextResponse.json(
      { message: "Failed to fetch mixtape" },
      { status: 500 }
    );
  }
} 