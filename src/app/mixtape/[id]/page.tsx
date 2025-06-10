"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

interface SortableSongItemProps {
  song: Song;
  index: number;
}

function SortableSongItem({ song, index }: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-gray-100 rounded"
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:text-[#F47B3E] transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
        <span className="text-gray-500 w-8">{index + 1}</span>
        <div>
          <h3 className="font-medium">{song.title}</h3>
          <p className="text-gray-600">{song.artist}</p>
        </div>
      </div>
      <span className="text-gray-600">{formatDuration(song.duration)}</span>
    </div>
  );
}

export default function MixtapeView({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mixtape, setMixtape] = useState<Mixtape | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !mixtape || active.id === over.id) return;

    const oldIndex = mixtape.songs.findIndex((song) => song.id === active.id);
    const newIndex = mixtape.songs.findIndex((song) => song.id === over.id);

    if (oldIndex !== newIndex) {
      // Update local state immediately for smooth UI
      const newSongs = arrayMove(mixtape.songs, oldIndex, newIndex).map((song, index) => ({
        ...song,
        order: index,
      }));

      setMixtape({
        ...mixtape,
        songs: newSongs,
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
            songs: newSongs.map((song) => ({
              id: song.spotifyId,
              title: song.title,
              artist: song.artist,
              duration: song.duration,
              order: song.order,
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
    }
  };

  const copyShareLink = async () => {
    if (!mixtape) return;
    const shareUrl = `${window.location.origin}/share/${mixtape.shareId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!", {
      duration: 2000,
      position: "bottom-center",
      style: {
        background: "#333",
        color: "#fff",
        borderRadius: "8px",
        padding: "12px 24px",
      },
    });
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

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center pt-16 px-4">
      <Toaster />
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-6xl mb-2 font-serif">{mixtape.title}</h1>
            {mixtape.description && (
              <p className="text-gray-600">{mixtape.description}</p>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="accent" onClick={() => setShowShareModal(true)}>
              Share
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mixtape.songs.map((song) => song.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {mixtape.songs.map((song, index) => (
                  <SortableSongItem
                    key={song.id}
                    song={song}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-2xl font-serif mb-4">Share Mixtape</h2>
            <p className="text-gray-600 mb-6">
              Share this link with your friends to let them listen to your mixtape:
            </p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/share/${mixtape.shareId}`}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F47B3E] focus:border-transparent"
              />
              <Button
                variant="accent"
                onClick={copyShareLink}
                className="whitespace-nowrap"
              >
                Copy Link
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowShareModal(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 