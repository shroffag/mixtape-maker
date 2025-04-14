import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { options } from "../../../auth/[...nextauth]/options";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?.name) {
      return new NextResponse("Unauthorized - No user name found", { status: 401 });
    }

    const body = await request.json();
    const { songs } = body;

    if (!songs?.length) {
      return new NextResponse("No songs provided", { status: 400 });
    }

    console.log("Saving songs for mixtape:", params.id);

    // Verify mixtape ownership
    const mixtape = await prisma.mixtape.findUnique({
      where: {
        id: params.id,
        createdBy: session.user.name,
      },
    });

    if (!mixtape) {
      console.error("Mixtape not found or unauthorized:", params.id);
      return new NextResponse("Mixtape not found or unauthorized", { status: 404 });
    }

    // Delete existing songs
    await prisma.song.deleteMany({
      where: {
        mixtapeId: params.id,
      },
    });

    // Create new songs
    const createdSongs = await Promise.all(
      songs.map((song: any) =>
        prisma.song.create({
          data: {
            spotifyId: song.id,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            order: song.order || 0,
            mixtapeId: params.id,
          },
        })
      )
    );

    console.log(`Successfully saved ${createdSongs.length} songs`);
    return NextResponse.json(createdSongs);
  } catch (error) {
    console.error("Error saving songs:", error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
} 