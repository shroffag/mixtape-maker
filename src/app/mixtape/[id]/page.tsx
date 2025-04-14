"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import Button from "@/components/Button";

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
  description?: string;
  createdAt: string;
  songs: Song[];
  shareId: string;
}

export default function MixtapeView({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mixtape, setMixtape] = useState<Mixtape | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchMixtape = async () => {
      try {
        console.log("Fetching mixtape:", params.id);
        const response = await fetch(`/api/mixtapes/${params.id}`);
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to fetch mixtape: ${error}`);
        }
        const data = await response.json();
        console.log("Mixtape loaded:", data);
        setMixtape(data);
      } catch (error) {
        console.error("Error fetching mixtape:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.name) {
      fetchMixtape();
    }
  }, [params.id, session?.user?.name]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !mixtape) return;

    const items = Array.from(mixtape.songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for smooth UI
    setMixtape({
      ...mixtape,
      songs: items.map((song, index) => ({ ...song, order: index })),
    });

    // Save the new order to the server
    setIsSaving(true);
    try {
      const response = await fetch(`/api/mixtapes/${params.id}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songs: items.map((song, index) => ({
            id: song.spotifyId,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            order: index,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save song order: ${error}`);
      }
    } catch (error) {
      console.error("Error saving song order:", error);
      // Revert to original order if save fails
      setMixtape(mixtape);
    } finally {
      setIsSaving(false);
    }
  };

  const copyShareLink = async () => {
    if (!mixtape) return;
    const shareUrl = `${window.location.origin}/share/${mixtape.shareId}`;
    await navigator.clipboard.writeText(shareUrl);
    // You could add a toast notification here
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl">Loading mixtape...</h1>
        </div>
      </div>
    );
  }

  if (!mixtape) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Mixtape not found</h1>
          <Button variant="accent" onClick={() => router.push("/")}>
            Go to Home
          </Button>
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
    <div className="min-h-screen bg-white text-black flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-6xl mb-2 font-serif">{mixtape.title}</h1>
            {mixtape.description && (
              <p className="text-gray-600">{mixtape.description}</p>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => setShowShareModal(true)}>
              Share
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="songs">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {mixtape.songs.map((song, index) => (
                    <Draggable
                      key={song.id}
                      draggableId={song.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between p-4 rounded ${
                            snapshot.isDragging
                              ? "bg-gray-200 shadow-lg"
                              : "bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-500 w-8">
                              {index + 1}
                            </span>
                            <div>
                              <h3 className="font-medium">{song.title}</h3>
                              <p className="text-gray-600">{song.artist}</p>
                            </div>
                          </div>
                          <span className="text-gray-600">
                            {formatDuration(song.duration)}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Share Mixtape</h2>
            <p className="text-gray-400 mb-4">
              Share this link with your friends to let them listen to your mixtape:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/share/${mixtape.shareId}`}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 