"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import CassetteTape from "@/app/components/CassetteTape";

interface Song {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  duration: number;
  order: number;
}

interface Mixtape {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  createdBy: string;
  songs: Song[];
  shareId: string;
}

interface PlayerState {
  track_window: {
    current_track: {
      uri: string;
    };
  };
  paused: boolean;
  position: number;
  duration: number;
}

export default function SharedMixtapeView({ params }: { params: { shareId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mixtape, setMixtape] = useState<Mixtape | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [currentTrack, setCurrentTrack] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      // Store the current URL to redirect back after sign in
      const currentUrl = `/share/${params.shareId}`;
      signIn("spotify", { callbackUrl: currentUrl });
    }
  }, [status, params.shareId]);

  useEffect(() => {
    const fetchMixtape = async () => {
      try {
        console.log("Fetching mixtape...", params.shareId);
        const response = await fetch(`/api/mixtapes/share/${params.shareId}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Failed to fetch mixtape:", data);
          throw new Error(data.message || "Failed to fetch mixtape");
        }

        console.log("Mixtape data received:", data);
        setMixtape(data);
      } catch (error) {
        console.error("Error fetching mixtape:", error);
        setError(error instanceof Error ? error.message : "Failed to load mixtape");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated" && session?.accessToken) {
      fetchMixtape();
    }
  }, [status, params.shareId, session?.accessToken]);

  useEffect(() => {
    if (isSpotifyReady && session?.accessToken) {
      let stateCheckInterval: NodeJS.Timeout;
      
      const initializePlayer = async () => {
        try {
          console.log("Initializing Spotify player...");
          if (!window.Spotify) {
            console.error("Spotify SDK not loaded");
            setError("Spotify player not available");
            return;
          }

          const player = new window.Spotify.Player({
            name: "Mixtape Player",
            getOAuthToken: (cb: (token: string) => void) => {
              console.log("Getting OAuth token...");
              if (session?.accessToken) {
                cb(session.accessToken);
              }
            },
            volume: 0.5
          });

          player.addListener("ready", ({ device_id }: { device_id: string }) => {
            console.log("Player is ready with device ID:", device_id);
            setDeviceId(device_id);
            setPlayer(player);
            setError(null); // Clear any previous errors
          });

          player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
            console.log("Device ID has gone offline", device_id);
            setError("Player is not ready");
          });

          player.addListener("initialization_error", ({ message }: { message: string }) => {
            console.error("Failed to initialize player:", message);
            setError(`Failed to initialize player: ${message}`);
          });

          player.addListener("authentication_error", ({ message }: { message: string }) => {
            console.error("Failed to authenticate:", message);
            setError(`Failed to authenticate with Spotify: ${message}`);
          });

          player.addListener("account_error", ({ message }: { message: string }) => {
            console.error("Failed to validate Spotify account:", message);
            setError(`Failed to validate Spotify account: ${message}`);
          });

          player.addListener("player_state_changed", (state: PlayerState) => {
            console.log("Player state changed:", state);
            if (state) {
              setPlayerState(state);
              setIsPlaying(!state.paused);
              
              // Update current track
              const currentTrackIndex = mixtape?.songs.findIndex(
                (song) => song.spotifyId === state.track_window.current_track.uri.split(":")[2]
              );
              if (currentTrackIndex !== undefined && currentTrackIndex !== -1) {
                setCurrentTrack(currentTrackIndex);
              }
            }
          });

          // Add periodic state check to ensure we're in sync
          stateCheckInterval = setInterval(async () => {
            if (player) {
              const state = await player.getCurrentState();
              if (state) {
                setPlayerState(state);
                setIsPlaying(!state.paused);
              }
            }
          }, 1000);

          console.log("Connecting to Spotify...");
          const connected = await player.connect();
          
          if (connected) {
            console.log("Successfully connected to Spotify");
            setPlayer(player);
          } else {
            console.error("Failed to connect to Spotify");
            setError("Failed to connect to Spotify");
          }
        } catch (error) {
          console.error("Error initializing player:", error);
          setError(`Failed to initialize player: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      initializePlayer();

      return () => {
        clearInterval(stateCheckInterval);
        if (player) {
          console.log("Disconnecting player...");
          player.disconnect();
        }
      };
    }
  }, [session?.accessToken, isSpotifyReady, mixtape?.songs]);

  const playMixtape = async () => {
    if (!deviceId || !mixtape?.songs.length) {
      console.error("No device ID or songs available");
      setError("Cannot play mixtape: No device available");
      return;
    }

    try {
      console.log("Attempting to play mixtape...");
      
      // First, transfer playback to our device
      const transferResponse = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      });

      if (!transferResponse.ok && transferResponse.status !== 204) {
        console.error("Failed to transfer playback:", transferResponse.status);
        throw new Error("Failed to transfer playback to device");
      }

      // Wait a bit for the transfer to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then start playing the tracks
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: mixtape.songs.map((song) => `spotify:track:${song.spotifyId}`),
        }),
      });

      if (!playResponse.ok && playResponse.status !== 204) {
        const errorData = await playResponse.json().catch(() => ({}));
        console.error("Failed to play mixtape:", errorData);
        throw new Error(errorData.error?.message || "Failed to play mixtape");
      }

      console.log("Successfully started playback");
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing mixtape:", error);
      setError(error instanceof Error ? error.message : "Failed to play mixtape");
    }
  };

  const togglePlayPause = async () => {
    if (!player) {
      console.error("No player available");
      setError("Cannot control playback: No player available");
      return;
    }

    console.log("togglePlayPause called. isPlaying:", isPlaying, "playerState?.paused:", playerState?.paused);

    try {
      if (!isPlaying || playerState?.paused) {
        // RESUME: Transfer playback, then start at correct position using Web API
        if (deviceId && session?.accessToken && mixtape && mixtape.songs[currentTrack]) {
          const track = mixtape.songs[currentTrack];
          const position = playerState?.position || 0;
          const uri = `spotify:track:${track.spotifyId}`;
          console.log("[RESUME] Transferring playback to device", deviceId);
          const transferResponse = await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [deviceId],
              play: false,
            }),
          });
          if (!transferResponse.ok && transferResponse.status !== 204) {
            console.error("Failed to transfer playback:", transferResponse.status);
            throw new Error("Failed to transfer playback to device");
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`[RESUME] Starting playback at position ${position}ms for track ${uri}`);
          const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: mixtape.songs.map((s) => `spotify:track:${s.spotifyId}`),
              offset: { uri },
              position_ms: position,
            }),
          });
          if (!playResponse.ok && playResponse.status !== 204) {
            const errorData = await playResponse.json().catch(() => ({}));
            console.error("Failed to start playback:", errorData);
            throw new Error(errorData.error?.message || "Failed to start playback");
          }
          console.log("[RESUME] Successfully started playback");
        } else {
          console.warn("[RESUME] Missing deviceId, accessToken, mixtape, or track");
        }
      } else {
        // PAUSE: Just pause
        console.log("[PAUSE] Pausing playback...");
        await player.pause();
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      setError("Failed to control playback");
    }
  };

  // Set up the Spotify SDK callback before loading the script
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsSpotifyReady(true);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!mixtape) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div>Mixtape not found</div>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Script
        src="https://sdk.scdn.co/spotify-player.js"
        strategy="afterInteractive"
      />
      <div className="min-h-screen bg-white text-black flex flex-col items-center pt-16 px-4">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="text-6xl mb-4 font-serif">{mixtape.title}</h1>
          <p className="text-2xl mb-6">{mixtape.description}</p>
          <p className="text-base mb-12">Made just for you by {mixtape.createdBy}</p>

          {!session ? (
            <div className="mb-8">
              <p className="text-gray-600 mb-4">
                Please sign in with Spotify to play this mixtape.
              </p>
              <button
                onClick={() => signIn("spotify")}
                className="bg-black text-white font-medium py-2 px-6 rounded"
              >
                Sign in with Spotify
              </button>
            </div>
          ) : (
            <div className="mb-16 flex flex-col items-center">
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
                  {error}
                </div>
              )}
              <div className="w-[300px] mb-16">
                <CassetteTape
                  isPlaying={isPlaying}
                  currentSong={
                    mixtape.songs[currentTrack]
                      ? {
                          title: mixtape.songs[currentTrack].title,
                          artist: mixtape.songs[currentTrack].artist,
                        }
                      : undefined
                  }
                />
              </div>
              <button
                onClick={isPlaying ? togglePlayPause : playMixtape}
                className="w-20 h-20 rounded-full bg-[#F47B3E] hover:bg-[#E06A2D] flex items-center justify-center"
              >
                {isPlaying ? (
                  <svg
                    className="w-10 h-10 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          <div className="w-full text-left space-y-6">
            {mixtape.songs.map((song, index) => (
              <div
                key={song.id}
                className={`flex items-center space-x-6 ${
                  currentTrack === index ? "text-[#F47B3E]" : ""
                }`}
              >
                <span className="w-6">{index + 1}</span>
                <div className="flex-1">
                  <h3 className="font-medium">{song.title}</h3>
                  <p className="text-gray-600">{song.artist}</p>
                </div>
                <span className="text-gray-600">
                  {formatDuration(song.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
} 