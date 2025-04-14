"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import { SearchIcon, PlusIcon, XIcon } from "lucide-react";
import Button from "@/components/Button";

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  uri: string;
}

export default function SongSelection({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mixtape, setMixtape] = useState<{ title: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Fetch mixtape details
    const fetchMixtape = async () => {
      try {
        const response = await fetch(`/api/mixtapes/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch mixtape");
        const data = await response.json();
        setMixtape(data);
      } catch (error) {
        console.error("Error fetching mixtape:", error);
      }
    };

    fetchMixtape();
  }, [params.id]);

  const searchSongs = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Failed to search songs");
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching songs:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchSongs(searchQuery);
  }, [searchQuery, searchSongs]);

  const addSong = (song: Song) => {
    setSelectedSongs((prev) => [...prev, { ...song, order: prev.length }]);
    setSearchResults((prev) => prev.filter((s) => s.id !== song.id));
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const removeSong = (songId: string) => {
    setSelectedSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const saveMixtape = async () => {
    if (selectedSongs.length === 0) return;

    setIsLoading(true);
    try {
      console.log("Saving songs:", selectedSongs);
      const response = await fetch(`/api/mixtapes/${params.id}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songs: selectedSongs.map((song, index) => ({
            ...song,
            order: index,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save songs: ${error}`);
      }

      router.push(`/mixtape/${params.id}`);
    } catch (error) {
      console.error("Error saving songs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Please sign in to continue</h1>
          <Button variant="accent" onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-6xl mb-8 font-serif text-center">
          Add Songs to {mixtape?.title || "Your Mixtape"}
        </h1>

        {/* Search Section */}
        <form onSubmit={(e) => e.preventDefault()} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search for songs..."
              className="w-full p-4 pr-12 border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F47B3E] focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#F47B3E]"></div>
              ) : (
                <SearchIcon className="text-gray-500 hover:text-[#F47B3E]" size={24} />
              )}
            </div>
          </div>
        </form>

        {/* Search Results */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="mb-12">
            <div className="bg-gray-100 rounded-lg max-h-80 overflow-y-auto">
              {searchResults.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-200 border-b border-gray-200 last:border-b-0"
                >
                  <div>
                    <h3 className="font-medium">{song.title}</h3>
                    <p className="text-gray-600">{song.artist}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">{formatDuration(song.duration)}</span>
                    <button
                      onClick={() => addSong(song)}
                      className="p-1.5 rounded-full bg-[#F47B3E] text-white hover:bg-[#E06A2D]"
                    >
                      <PlusIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Songs */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4 font-serif">Selected Songs</h2>
          {selectedSongs.length === 0 ? (
            <p className="text-gray-600">No songs selected yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedSongs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-4 bg-gray-100 rounded"
                >
                  <div>
                    <h3 className="font-medium">{song.title}</h3>
                    <p className="text-gray-600">{song.artist}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">{formatDuration(song.duration)}</span>
                    <button
                      onClick={() => removeSong(song.id)}
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <XIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={saveMixtape}
            disabled={selectedSongs.length === 0 || isLoading}
            className={selectedSongs.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
          >
            {isLoading ? "Saving..." : "Save Mixtape"}
          </Button>
        </div>
      </div>
    </div>
  );
} 