import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(options);
    
    if (!session) {
      console.error("No session found");
      return new NextResponse("Unauthorized - No session", { status: 401 });
    }

    if (!session.accessToken) {
      console.error("No access token found in session");
      return new NextResponse("Unauthorized - No access token", { status: 401 });
    }

    // Check for refresh token error
    if (session.error === "RefreshAccessTokenError") {
      console.error("Refresh token error - user needs to sign in again");
      return new NextResponse("Token expired - Please sign in again", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return new NextResponse("Missing query parameter", { status: 400 });
    }

    console.log("Searching Spotify with query:", query);
    console.log("Using access token:", session.accessToken.slice(0, 10) + "...");

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Spotify API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // If token is invalid, return 401 to trigger re-authentication
      if (response.status === 401) {
        return new NextResponse("Spotify token expired", { status: 401 });
      }

      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.tracks?.items) {
      console.error("Unexpected Spotify API response:", data);
      throw new Error("Invalid response from Spotify API");
    }

    const tracks = data.tracks.items.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      duration: track.duration_ms,
      uri: track.uri,
    }));

    console.log(`Found ${tracks.length} tracks`);
    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
} 